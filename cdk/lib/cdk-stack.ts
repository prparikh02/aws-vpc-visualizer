import { Construct, Duration, Stack, StackProps, } from '@aws-cdk/core';
import { Cors, LambdaIntegration, MethodLoggingLevel, RestApi } from '@aws-cdk/aws-apigateway';
import { Certificate } from '@aws-cdk/aws-certificatemanager';
import {
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  OriginProtocolPolicy,
  ViewerCertificate,
  ViewerProtocolPolicy
} from '@aws-cdk/aws-cloudfront';
import { AnyPrincipal, Effect, PolicyStatement }  from '@aws-cdk/aws-iam';
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
            domainName: `${apiGateway.restApiId}.execute-api.${this.region}.${this.urlSuffix}`, 
            originProtocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
          },
          behaviors: [
            {
              pathPattern: '*/api/*',  // TODO: Revisit this and see construct can be referenced.
              allowedMethods: CloudFrontAllowedMethods.ALL,
              minTtl: Duration.seconds(0),
              maxTtl: Duration.seconds(0),
              forwardedValues: {
                queryString: false,
                headers: [
                  'Authorization',
                  'Content-Type',
                  'Accept',
                  'Accept-Encoding',
                ],
                cookies: {
                  forward: 'whitelist',
                  whitelistedNames: [
                    'cognito-auth',  // TODO: This is just future-proofing for auth portal.
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
