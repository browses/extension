/*
 * addBrowserViewed
 *
 * Add browser to the list of viewers of a particular URL.
 * Browser must send valid Facebook access token.
 * The links table contains a list of browsers who have clicked
 * into this particular browse, this functions updates the list
 * with the authenticated browser.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses/view
 * @method: POST
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const request = require('request');


exports.handle = function handler(event, context) {
  if (!event.url) {
    context.fail('Bad Request: Missing url parameter');
    return;
  }
  if (!event.token) {
    context.fail('Bad Request: Missing token parameter');
    return;
  }
  /*
   * Validate access token and get Facebook ID and name.
   */
  request({
    url: `https://graph.facebook.com/me?access_token=${event.token}`,
    method: 'GET',
  }, (error, rsp, body) => {
    if (!error && rsp.statusCode === 200) {
      if (!body.hasOwnProperty('error')) {
        /*
         * Successfully validated token
         */
        const browser = JSON.parse(body).id;
        const name = JSON.parse(body).name;
        const linkParams = {
          TableName: 'links',
          Key: {
            url: event.url,
          },
          UpdateExpression: 'ADD browsers :brs',
          ExpressionAttributeValues: {
            ':brs': dynamo.createSet([browser]),
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
            browser,
            name,
            url: event.url,
          });
        });
      } else {
        const resp = JSON.parse(body);
        context.fail(`Unprocessable Entity: ${resp.error.message}`);
        return;
      }
    } else {
      context.fail('Unauthorized: Failed to validate access token');
      return;
    }
  });
};
