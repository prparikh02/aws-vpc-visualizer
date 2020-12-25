import * as cdk from '@aws-cdk/core';

export class AwsVpcVisualizerStack extends cdk.Stack {
  constructor(
      scope: cdk.Construct,
      id: string,
      dev: boolean,
      disambiguator: string,
      props?: cdk.StackProps,
  ) {
    super(scope, id, props);

  }
}
