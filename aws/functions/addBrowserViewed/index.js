/*
 * addBrowserViewed
 *
 * Add browser to the list of viewers of a particular URL.
 * Browser must be authenticated and send valid token from cognito.
 * The links table contains a list of browsers who have clicked
 * into this particular browse, this functions updates the list
 * with the authenticated browser.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /links/view
 * @method: POST
 * @params:
 *      - browser: username [string]
 *      - url: browse URL [string]
 *      - token: jwt token from cognito [string]
 * @returns:
 *      - browser [string]
 *      - url [string]
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const cognito = new aws.CognitoIdentity();
const settings = require('./settings.json');
const jwt = require('jsonwebtoken');


exports.handle = function handler(event, context) {
  if (!event.browser) {
    context.fail('Bad Request: Missing browser parameter');
    return;
  }
  if (!event.url) {
    context.fail('Bad Request: Missing url parameter');
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
      const linkParams = {
        TableName: 'links',
        Key: {
          url: event.url,
        },
        UpdateExpression: 'ADD browsers :brs',
        ExpressionAttributeValues: {
          ':brs': dynamo.createSet([event.browser]),
        },
      };
      /*
       * Update links table with browsers view.
       */
      dynamo.update(linkParams, (linkError) => {
        if (linkError) {
          context.fail('Internal Error: Failed to update database.');
          return;
        }
        context.succeed({
          browser: event.browser,
          url: event.url,
        });
      });
    });
  } else {
    context.fail('Unprocessable Entity: Failed to parse token.');
    return;
  }
};
