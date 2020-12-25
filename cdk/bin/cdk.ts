#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsVpcVisualizerStack } from '../lib/cdk-stack';

const app = new cdk.App();

const projectName = 'AwsVpcVisualizerStack'

interface StageOperationalConfig {
  'version': string,
  'region': string,
  'isDev': boolean,
  'stackId': string | undefined,
  'disambiguator': string | undefined,
}

interface ProjectOperationalConfig {
  'Beta': StageOperationalConfig,
  'Prod': StageOperationalConfig,
}

// Operational configuration
const config: ProjectOperationalConfig = {
  'Beta': {
    'version': '100',
    'region': 'us-east-1',
    'isDev': true,
    'stackId': undefined,
    'disambiguator': undefined,
  },
  'Prod': {
    'version': '100',
    'region': 'us-east-1',
    'isDev': false,
    'stackId': undefined,
    'disambiguator': undefined,
  },
};
Object.entries(config).forEach(([stage, configVals]) => {
  configVals['stackId'] = `${projectName}-${stage}-v${configVals['version']}`
  configVals['disambiguator'] = stage
});

// Stack definitions
Object.entries(config).forEach(([stage, configVals]) => {
  new AwsVpcVisualizerStack(
    app,
    configVals['stackId'],
    configVals['isDev'],
    configVals['disambiguator'],
    {
      env: {
        region: configVals['region'],
      },
    },
  );
});
