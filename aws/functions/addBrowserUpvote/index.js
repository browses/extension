/*
 * addBrowserUpvote
 *
 * Save browser's interest in a particular URL. Browser must
 * send a valid Facebook access token.
 * The links table contains a list of users who find the browse
 * either useful, interesting or entertaining. This function adds
 * the user to the corresponding list associated with this URL.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses/upvote
 * @method: POST
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });
const request = require('request');
const options = ['interesting', 'entertaining', 'useful'];


exports.handle = function handler(event, context) {
  if (!event.url) {
    context.fail('Bad Request: Missing url parameter');
    return;
  }
  if (!event.upvote) {
    context.fail('Bad Request: Missing upvote parameter, either useful ' +
                 'interesting or entertaining');
    return;
  }
  if (!event.token) {
    context.fail('Bad Request: Missing token parameter');
    return;
  }
  if (options.indexOf(event.upvote) <= -1) {
    context.fail('Bad Request: upvote parameter must be either useful, ' +
                 'interesting or entertaining');
    return;
  }
  /*
   * Validate access token, and get Facebook ID and name.
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
          UpdateExpression: `ADD ${event.upvote} :brs, browsers :brs`,
          ExpressionAttributeValues: {
            ':brs': dynamo.createSet([browser]),
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
            browser,
            name,
            url: event.url,
            upvote: event.upvote,
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
