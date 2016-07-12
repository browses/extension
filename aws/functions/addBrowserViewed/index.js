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
 * @test: npm test
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const request = require('request');


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
   * Validate JSON Web Token.
   */
  request({
    url: 'https://7ibd5w7y69.execute-api.eu-west-1.amazonaws.com/beta/validate',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    json: { username: event.browser, token: event.token, service: 'browses' },
  }, (error, rsp, body) => {
    if (!error && rsp.statusCode === 200) {
      // Successfully validated token
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
    } else {
      context.fail(body);
      return;
    }
  });
};
