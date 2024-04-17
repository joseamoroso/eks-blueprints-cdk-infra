import * as cdk from 'aws-cdk-lib';
import * as eksBlueprints from '@aws-quickstart/eks-blueprints';
import { Construct } from 'constructs';
import { InstanceClass, InstanceSize, InstanceType } from 'aws-cdk-lib/aws-ec2';
import { Namer } from 'multi-convention-namer';

export class EksBlueprintsCdkInfraStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps = { env: { region: 'us-east-1' } },
  ) {
    super(scope, id, props);
    const _id = new Namer([id]);
    eksBlueprints.HelmAddOn.validateHelmVersions = true; // optional if you would like to check for newer versions

    const buildArgoBootstrap: eksBlueprints.ArgoCDAddOnProps = {
      name: 'addons',
      version: '6.7.11',
      bootstrapRepo: {
        repoUrl: 'https://github.com/joseamoroso/eks-blueprints-add-ons.git',
        path: 'chart',
        targetRevision: 'main',
      },
    };

    const devBootstrapProps = new eksBlueprints.ArgoCDAddOn({
      ...buildArgoBootstrap,
      workloadApplications: [
        {
          name: 'dev-workloads',
          namespace: 'default',
          values: [],
          repository: {
            repoUrl:
              'https://github.com/joseamoroso/eks-blueprints-workloads-charts',
            path: 'argocd/dev',
            targetRevision: 'main',
          },
        },
      ],
    });

    const prodBootstrapProps = new eksBlueprints.ArgoCDAddOn({
      ...buildArgoBootstrap,
      workloadApplications: [
        {
          name: 'prod-workloads',
          namespace: 'default',
          values: [],
          repository: {
            repoUrl:
              'https://github.com/joseamoroso/eks-blueprints-workloads-charts',
            path: 'argocd/prod',
            targetRevision: 'main',
          },
        },
      ],
    });

    const mngClusterProvider = new eksBlueprints.MngClusterProvider({
      nodegroupName: _id.addSuffix(['Mng']).kebab,
      instanceTypes: [InstanceType.of(InstanceClass.M5, InstanceSize.LARGE)],
      minSize: 2,
    });

    const hostedZoneID = 'MyHostedZone1';

    const addons = [
      new eksBlueprints.addons.AwsLoadBalancerControllerAddOn({
        values: {
          serviceAccountName: 'aws-load-balancer-controller',
        },
      }),
      new eksBlueprints.addons.ExternalDnsAddOn({
        values: {
          zoneIdFilter: hostedZoneID,
        },
        hostedZoneResources: [hostedZoneID],
      }),
    ];

    const builder = eksBlueprints.EksBlueprint.builder()
      .version('auto')
      .region(props.env?.region)
      .clusterProvider(mngClusterProvider)
      .resourceProvider(
        eksBlueprints.GlobalResources.Vpc,
        new eksBlueprints.VpcProvider(),
      )
      .resourceProvider(
        hostedZoneID,
        new eksBlueprints.LookupHostedZoneProvider('joseamoroso.com'),
      );

    builder
      .clone()
      .addOns(...addons)
      .addOns(devBootstrapProps)
      .enableGitOps(eksBlueprints.GitOpsMode.APP_OF_APPS)
      .build(this, _id.addSuffix(['dev']).kebab);

    builder
      .clone()
      .addOns(...addons)
      .addOns(prodBootstrapProps)
      .enableGitOps(eksBlueprints.GitOpsMode.APP_OF_APPS)
      .build(this, _id.addSuffix(['prod']).kebab);
  }
}
