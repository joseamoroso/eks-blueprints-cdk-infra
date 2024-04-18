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
    eksBlueprints.HelmAddOn.validateHelmVersions = true; // optional if you would like to check for newer versions

    const buildArgoBootstrap = new eksBlueprints.ArgoCDAddOn({
      version: '6.7.11',
      bootstrapRepo: {
        name: 'addons',
        repoUrl: 'https://github.com/joseamoroso/eks-blueprints-add-ons.git',
        path: 'chart',
        targetRevision: 'main',
      },
      workloadApplications: [
        {
          name: 'dev-workloads',
          namespace: 'dev',
          values: [],
          repository: {
            repoUrl:
              'https://github.com/joseamoroso/eks-blueprints-workloads-charts',
            path: 'argocd/dev',
            targetRevision: 'main',
          },
        },
        {
          name: 'prod-workloads',
          namespace: 'prod',
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

    const adminTeam = new eksBlueprints.PlatformTeam({
      name: 'admins',
      userRoleArn:
        'arn:aws:iam::321852949023:role/AWSReservedSSO_AccesoAdministrador_beef58d1f2a77d76',
    });

    const mngClusterProvider = new eksBlueprints.MngClusterProvider({
      nodegroupName: `${id}Mng`,
      instanceTypes: [InstanceType.of(InstanceClass.M5, InstanceSize.LARGE)],
      minSize: 2,
    });

    const addons = [
      new eksBlueprints.addons.AwsLoadBalancerControllerAddOn({
        values: {
          serviceAccountName: 'aws-load-balancer-controller',
        },
      }),
      buildArgoBootstrap,
    ];

    eksBlueprints.EksBlueprint.builder()
      .version('auto')
      .region(props.env?.region)
      .clusterProvider(mngClusterProvider)
      .resourceProvider(
        eksBlueprints.GlobalResources.Vpc,
        new eksBlueprints.VpcProvider(),
      )
      .teams(adminTeam)
      .addOns(...addons)
      .enableGitOps(eksBlueprints.GitOpsMode.APP_OF_APPS)
      .build(this, id);
  }
}
