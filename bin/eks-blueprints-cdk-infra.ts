#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EksBlueprintsCdkInfraStack } from '../lib/eks-blueprints-cdk-infra-stack';

const app = new cdk.App();
new EksBlueprintsCdkInfraStack(app, 'EksBlueprintsGitOps', {
  env: { region: 'us-east-1' },
});