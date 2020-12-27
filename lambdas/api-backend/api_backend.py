import json
import uuid

import boto3


sts_client = boto3.client('sts')


def handler(event, context):
    print('request: {}'.format(json.dumps(event)))

    data = {}
    query_params = event['queryStringParameters']
    if query_params:
        print('Query Paramters: {}'.format(query_params))
        ec2_client = create_client(
            'ec2',
            query_params['roleArn'],
            query_params['region'],
        )
        data = ec2_client.describe_security_groups()

    # Response format:
    # https://aws.amazon.com/premiumsupport/knowledge-center/malformed-502-api-gateway/
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',  # TODO: Remove this
        },
        'isBase64Encoded': False,
        'body': json.dumps(data, separators=(',', ':')),
    }


def get_security_groups(client):
    pass


def create_client(service_name, role_arn, region):
    external_account = sts_client.assume_role(
        RoleArn=role_arn,
        RoleSessionName='VpcVisualizerCrossAccount',
    )

    access_key = external_account['Credentials']['AccessKeyId']
    secret_key = external_account['Credentials']['SecretAccessKey']
    session_token = external_account['Credentials']['SessionToken']

    return boto3.client(
        service_name,
        region_name=region,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        aws_session_token=session_token,
    )

