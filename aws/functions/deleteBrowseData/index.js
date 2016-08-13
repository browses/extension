/*
 * deleteBrowseData
 *
 * Delete a browse from DynamoDB and S3.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: DELETE
 * @params:
 *      - id: browse id [string]
 *      - token: access token from facebook [string]
 * @returns:
 *      - id: browse id [string]
 *      - browser: Facebook id [string]
 *      - name: Facebook name [string]
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const s3 = new aws.S3();
const request = require('request');


exports.handle = function handler(event, context) {
  if (!event.id) {
    context.fail('Bad Request: Missing id parameter');
    return;
  }
  if (!event.token) {
    context.fail('Bad Request: Missing token parameter');
    return;
  }
  /*
   * Validate JSON Web Token.
   */
  request({
    url: `https://graph.facebook.com/me?access_token=${event.token}`,
    method: 'GET',
  }, (error, rsp, body) => {
    if (!error && rsp.statusCode === 200) {
      if (!body.hasOwnProperty('error')) {
        // Successfully validated token
        const response = JSON.parse(body);
        const browser = response.id;
        const name = response.name;
        const browseParams = {
          TableName: 'browses',
          Key: {
            id: event.id,
          },
          ConditionExpression: 'browser = :bsr',
          ExpressionAttributeValues: {
            ':bsr': browser,
          },
        };
        const s3Params = {
          Bucket: 'browses',
          Key: `${browser}/${event.id}`,
        };
        /*
         * Delete browse data from browses table.
         */
        dynamo.delete(browseParams, (browseErr) => {
          if (browseErr) {
            if (browseErr.code === 'ConditionalCheckFailedException') {
              context.fail('Unprocessable Entity: Browse belongs to a different user.');
              return;
            }
            context.fail('Internal Error: Failed to delete browse.');
            return;
          }
          s3.deleteObject(s3Params, (s3Err) => {
            if (s3Err) {
              context.fail('Internal Error: Failed to delete screenshot');
              return;
            }
            context.succeed({
              id: event.id,
              browser,
              name,
            });
          });
        });
      } else {
        const resp = JSON.parse(body);
        context.fail(`Unprocessable Entity: ${resp.error.message}`);
        return;
      }
    } else {
      context.fail('Internal Error: Failed to authorise with Facebook');
      return;
    }
  });
};
