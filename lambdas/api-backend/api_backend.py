import json
import uuid

import boto3


s3_client = boto3.client('s3')


def handler(event, context):
    print('request: {}'.format(json.dumps(event)))
    data = {
        'msg': (
            'Hello, CDK! You have hit {}. '
            'Here\'s a random UUID: {}\n'.format(
                event['path'], uuid.uuid4()
            )
        ),
    }
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
