import json
import uuid

import boto3

from app.security_groups import SecurityGroupProcessor
from app.serde import GraphEncoder


sts_client = boto3.client('sts')


def handler(event, context):
    print('request: {}'.format(json.dumps(event)))

    response_body = {}
    # TODO: This should be a POST request instead of GET.
    #       We don't want peoples' IAM roles logged in request logs.
    query_params = event['queryStringParameters']
    if query_params:
        print('Query Parameters: {}'.format(query_params))
        ec2_client = create_client(
            'ec2',
            query_params['roleArn'],
            query_params['region'],
        )
        api_response = ec2_client.describe_security_groups()
        # TODO: Check API response for errors
        security_groups = api_response['SecurityGroups']
        try:
            graph = SecurityGroupProcessor().get_graph(security_groups)
            response_body = json.loads(json.dumps(graph, cls=GraphEncoder))
        except Exception as e:
            print('Validation error: {}'.format(str(e)))
            return make_response(500, {'messages': [str(e)]})

    return make_response(200, body=response_body)


def make_response(status_code, body={}):
    # Response format:
    # https://aws.amazon.com/premiumsupport/knowledge-center/malformed-502-api-gateway/
    # Cannot add or remove top-level fields.
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',  # TODO: Remove this
        },
        'isBase64Encoded': False,
        'body': json.dumps(body, separators=(',', ':')),
    }


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

