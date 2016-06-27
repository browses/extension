/*
 * addBrowserUpvote
 *
 * Save browser's interest in a particular URL. Browser must
 * be authenticated and send a valid jwt token from cognito.
 * The links table  contains a list of users who find the browse
 * either useful, interesting or entertaining. This function adds
 * the user to the corresponding list associated with this URL.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /links/upvote
 * @method: POST
 * @params:
 *      - browser: username [string]
 *      - url: browse URL [string]
 *      - upvote: either useful, interesting or entertaining [string]
 *      - token: jwt token from cognito [string]
 * @returns:
 *      - browser [string]
 *      - url [string]
 *      - upvote [string]
 * @test: npm test
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
  if (!event.upvote) {
    context.fail('Bad Request: Missing upvote parameter, either useful interesting, or entertaining');
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
        UpdateExpression: `ADD ${event.upvote} :brs, browsers :brs`,
        ExpressionAttributeValues: {
          ':brs': dynamo.createSet([event.browser]),
        },
      };

      /*
       * Update links table with browsers interest.
       */
      dynamo.update(linkParams, (linkErr) => {
        if (linkErr) {
          context.fail('Internal Error: Failed to update database.');
          return;
        }
        context.succeed({
          browser: event.browser,
          url: event.url,
          upvote: event.upvote,
        });
      });
    });
  } else {
    context.fail('Unprocessable Entity: Failed to parse token.');
    return;
  }
};
