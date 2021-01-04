import { Construct, Duration, Stack, StackProps, Tags } from '@aws-cdk/core';
import {
  Cors,
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi
} from '@aws-cdk/aws-apigateway';
import { Certificate } from '@aws-cdk/aws-certificatemanager';
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  Distribution,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  ViewerCertificate,
  ViewerProtocolPolicy
} from '@aws-cdk/aws-cloudfront';
import { HttpOrigin, S3Origin } from '@aws-cdk/aws-cloudfront-origins';
import {
  AnyPrincipal,
  Effect,
  Policy,
  PolicyStatement,
  Role,
  User
}  from '@aws-cdk/aws-iam';
import { Code, Function, Runtime }  from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';

export class AwsVpcVisualizerStack extends Stack {
  constructor(
      scope: Construct,
      id: string,
      dev: boolean,
      stage: string,
      disambiguator: string,
      props?: StackProps,
  ) {
    super(scope, id, props);

    // Tag all constructs with the project for easy billing drilldown, 
    // filtering, and organization.
    Tags.of(this).add('project', id)

    // To normalize construct names/ids
    const toCanonical = (rootId: string) => {
      return `${rootId}-${disambiguator}`;
    };

    // Lambda function to handle API backend
    const apiBackendFn = new Function(this, toCanonical('ApiBackend'), {
      runtime: Runtime.PYTHON_3_8,
      handler: 'api_backend.handler',
      code: Code.fromAsset('../lambdas/api-backend'),
    });
    apiBackendFn.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: ['*'],
    }));

    // IAM Role to assume to describe VPC resources(for testing)
    const describeVpcResourcesRole = new Role(this, toCanonical('DescribeVpcResources'), {
      assumedBy: apiBackendFn.grantPrincipal,
    });
    describeVpcResourcesRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ec2:DescribeSecurityGroups'],
        resources: ['*'],
      }),
    );
    describeVpcResourcesRole.assumeRolePolicy

    // Create developer IAM users for local development
    if (dev) {
      const developmentUser = new User(this, toCanonical('DevelopmentUser'));
      const developmentPolicy = new Policy(this, toCanonical('DevelopmentPolicy'), {
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['sts:AssumeRole'],
            resources: [apiBackendFn.role!.roleArn],
          }),
        ]
      });
      developmentPolicy.attachToUser(developmentUser);
      (apiBackendFn.role! as Role).assumeRolePolicy?.addStatements(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          principals: [developmentUser.grantPrincipal],
        }),
      );
    }

    // API Gateway for REST API
    const apiGateway = new RestApi(this, toCanonical('AwsVpcVisualizerApi'), {
      deployOptions: {
        stageName: stage.toLowerCase(),
        loggingLevel: MethodLoggingLevel.INFO,
      },
    });
    const apiResource = apiGateway.root.addResource('api');
    const v1Api = apiResource.addResource('v1');
    const v1ApiSecurityGroups = v1Api.addResource('security-groups');
    // TODO: Maybe use POST to hide the request parameters in body
    v1ApiSecurityGroups.addMethod('GET', new LambdaIntegration(apiBackendFn));

    // If development environment, allow CORS from localhost
    // TODO: Remove this when using SAM. This is insecure.
    if (dev) {
      apiResource.addCorsPreflight({
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS,
        allowOrigins: [
          'http://localhost:3000',
        ],
      });
    }

    // Domain for API gateway
    const apiGatewayDomain =
      `${apiGateway.restApiId}.execute-api.${this.region}.${this.urlSuffix}`;

    // S3 Bucket for serving static assets
    const webAssetsBucket = new Bucket(this, toCanonical('WebAssets'), {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
    });
    webAssetsBucket.addToResourcePolicy(new PolicyStatement({
      effect: Effect.DENY,
      actions: ['s3:*'],
      resources: [webAssetsBucket.bucketArn],
      conditions: {
        'Bool': {
          'aws:SecureTransport': false,
        },
      },
      principals: [new AnyPrincipal()],
    }));
    new BucketDeployment(this, toCanonical('WebAssetsDeployment'), {
      sources: [Source.asset('../lib/web-app/build')],
      destinationBucket: webAssetsBucket,
    });

    // Certificate for subdomain vpc-visualizer.parthrparikh.com
    const cert = new Certificate(this, toCanonical('SubdomainCertificate'), {
      domainName: 'vpc-visualizer.parthrparikh.com',
    });

    // CloudFront Distribution
    // const cfDistribution = new Distribution(this, toCanonical('WebDistribution'), {
    //   defaultBehavior: {
    //     origin: new S3Origin(webAssetsBucket),
    //     allowedMethods: AllowedMethods.ALLOW_ALL,
    //     cachePolicy: (dev)
    //       ? CachePolicy.CACHING_DISABLED
    //       : CachePolicy.CACHING_OPTIMIZED,
    //     viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //   },
    //   additionalBehaviors: {
    //     '*/api/*': {
    //       origin: new HttpOrigin(apiGatewayDomain, {
    //         httpPort: 443,
    //         // originPath: `/${stage.toLowerCase()}`,
    //       }),
    //       compress: true,
    //       allowedMethods: AllowedMethods.ALLOW_ALL,
    //       viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
    //       originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
    //       // I am not sure why I cannot simply use CachePolicy.CACHING_DISABLED.
    //       // Seems like we have to set an allow list of headers.
    //       // Also there's an issue with enableAcceptEncoding* flags and some of
    //       // the headers. See:
    //       // https://github.com/aws-cloudformation/aws-cloudformation-coverage-roadmap/issues/571#issuecomment-746279203
    //       cachePolicy: new CachePolicy(this, toCanonical('ApiNoCache'), {
    //         minTtl: Duration.seconds(0),
    //         maxTtl: Duration.seconds(0),
    //         cookieBehavior: CacheCookieBehavior.all(),
    //         headerBehavior: CacheHeaderBehavior.allowList(
    //           'Accept',
    //           'Accept-Encoding',
    //           'Authorization',
    //           'Content-Type',
    //           'User-Agent',
    //         ),
    //         queryStringBehavior: CacheQueryStringBehavior.all(),
    //       }),
    //     }
    //   },
    //   certificate: cert,
    //   domainNames: ['vpc-visualizer.parthrparikh.com'],
    //   enableLogging: true,
    // });
    const cfDistro = new CloudFrontWebDistribution(this, toCanonical('WebDistribution'), {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: webAssetsBucket,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              defaultTtl: Duration.minutes(10),
              maxTtl: Duration.hours(1),
            },
          ],
        },
        {
          customOriginSource: {
            domainName: apiGatewayDomain,
            originProtocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
          },
          behaviors: [
            {
              pathPattern: '*/api/*',
              allowedMethods: CloudFrontAllowedMethods.ALL,
              defaultTtl: Duration.seconds(0),
              minTtl: Duration.seconds(0),
              maxTtl: Duration.seconds(0),
              forwardedValues: {
                queryString: true,
                headers: [
                  'Authorization',
                  'Content-Type',
                  'Accept',
                  'Accept-Encoding',
                ],
                cookies: {
                  forward: 'whitelist',
                  whitelistedNames: [
                    'cognito-auth',
                  ],
                },
              },
            },
          ],
        },
      ],
      viewerCertificate: ViewerCertificate.fromAcmCertificate(
        cert,
        {
          aliases: ['vpc-visualizer.parthrparikh.com'],
        },
      ),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      loggingConfig: {},
    });

    // TODO: Define CloudWatch
  }
}
