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
        api_response = ec2_client.describe_security_groups()
        # TODO: Check API response for errors
        security_groups = api_response['SecurityGroups']
        try:
            validate_security_groups(security_groups)
        except ValueError as e:
            print('Validation error: {}'.format(str(e)))
            return make_response(500, {'messages': [str(e)]})

    return make_response(200, body=api_response)


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


def validate_security_groups(security_groups):
    
    def validate_rule(rule):
        exclusive_fields = 0
        if rule['IpRanges'] or rule['Ipv6Ranges']:
            exclusive_fields += 1
        if rule['UserIdGroupPairs']:
            exclusive_fields += 1
        if rule['PrefixListIds']:
            exclusive_fields += 1

            if exclusive_fields == 0:
                raise ValueError('No mutually exclusive fields detected.')
            if exclusive_fields > 1:
                raise ValueError('More than two mutually exclusive fields detected.')

    for security_group_info in security_groups:
        for rule in security_group_info['IpPermissions']:
            validate_rule(rule)
        for rule in security_group_info['IpPermissionsEgress']:
            validate_rule(rule)


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

