import * as cdk from 'aws-cdk-lib';
import * as eksBlueprints from '@aws-quickstart/eks-blueprints';
import { Construct } from 'constructs';
import { InstanceClass, InstanceSize, InstanceType } from 'aws-cdk-lib/aws-ec2';

export class EksBlueprintsCdkInfraStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps = { env: { region: 'us-east-1' } },
  ) {
    super(scope, id, props);

    eksBlueprints.HelmAddOn.validateHelmVersions = true; // optional if you would like to check for newer versions

    const mngClusterProvider = new eksBlueprints.MngClusterProvider({
      nodegroupName: `${id}Mng`,
      instanceTypes: [InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM)],
      minSize: 2,
    });

    const addons = [
      new eksBlueprints.addons.AwsLoadBalancerControllerAddOn({
        values: {
          serviceAccountName: 'aws-load-balancer-controller',
        },
      }),
    ];

    eksBlueprints.EksBlueprint.builder()
      .version('auto')
      .region(props.env?.region)
      .clusterProvider(mngClusterProvider)
      .resourceProvider(
        eksBlueprints.GlobalResources.Vpc,
        new eksBlueprints.VpcProvider(),
      )
      .addOns(...addons)
      .build(this, id);
  }
}
