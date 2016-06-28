/*
 * deleteBrowseData
 *
 * Delete a browse from DynamoDB and S3.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: DELETE
 * @params:
 *      - browser: username [string]
 *      - published: browse URL [string]
 *      - shot: shot URL [string]
 *      - token: jwt token from cognito [string]
 * @returns:
 *      - browser [string]
 *      - url [string]
 *      - published [string]
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const cognito = new aws.CognitoIdentity();
const settings = require('./settings.json');
const jwt = require('jsonwebtoken');
const s3 = new aws.S3();


exports.handle = function handler(event, context) {
  if (!event.browser) {
    context.fail('Bad Request: Missing browser parameter');
    return;
  }
  if (!event.published) {
    context.fail('Bad Request: Missing published parameter');
    return;
  }
  if (!event.shot) {
    context.fail('Bad Request: Missing shot parameter');
    return;
  }
  if (!event.token) {
    context.fail('Bad Request: Missing token parameter');
    return;
  }
  /*
   * Check JWT for authentication.
   */
  const timestamp = (new Date()).getTime();
  const decoded = jwt.decode(event.token);
  if (decoded && decoded.hasOwnProperty('exp') &&
      decoded.hasOwnProperty('sub')) {
    const idParams = {
      IdentityPoolId: settings.identityPoolId,
      DeveloperUserIdentifier: event.browser,
      MaxResults: 1,
    };
    cognito.lookupDeveloperIdentity(idParams, (idError, idData) => {
      if (idError) {
        context.fail('Unprocessable Entity: Browser not registered.');
        return;
      }
      if (!idData.IdentityId) {
        context.fail('Internal Error: Failed to get identity id');
        return;
      }
      if (idData.IdentityId !== decoded.sub) {
        context.fail('Unauthorized: Browser and token ID didnt match.');
        return;
      }
      if (decoded.exp <= timestamp / 1000.0) {
        context.fail('Unauthorized: Token has expired.');
        return;
      }
      /*
       * Browser validated!
       */
      const browseParams = {
        TableName: 'browses',
        Key: {
          browser: event.browser,
          published: event.published,
        },
      };
      if (event.shot.indexOf('browses/') <= -1) {
        context.fail('Unprocessable Entity: Unrecognised shot url');
        return;
      }
      const s3Params = {
        Bucket: 'browses',
        Key: event.shot.split('browses/')[1],
      };
      /*
       * Delete browse data from browses table.
       */
      dynamo.delete(browseParams, (browseErr) => {
        if (browseErr) {
          context.fail('Internal Error: Failed to delete browse.');
          return;
        }
        s3.deleteObject(s3Params, (s3Err) => {
          if (s3Err) {
            context.fail('Internal Error: Failed to delete screenshot');
            return;
          }
          context.succeed({
            browser: event.browser,
            shot: event.shot,
            published: event.published,
          });
        });
      });
    });
  } else {
    context.fail('Unprocessable Entity: Failed to parse token.');
    return;
  }
};
