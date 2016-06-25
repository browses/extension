/*
 * getLatestBrowseData
 *
 * Get all browses from the last 24 hours.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: GET
 * @returns:
 *      - array of objects...
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });

/*
 * Remove duplicates from an array.
 */
function uniq(a) {
  return a.sort().filter(function(item, pos, ary) {
    return !pos || item !== ary[pos - 1];
  });
}

/*
 * Merge two objects.
 */
function extend(a, b) {
  for (var key in b) {
    if (b.hasOwnProperty(key)) {
      a[key] = b[key];
    }
  }
  return a;
}

/*
 * Merge browses and links.
 */
function merge(browses, links) {
  return browses.map(function (browse) {
    const link = links.filter(function (l) {
      return l.url === browse.url;
    });
    return extend(browse, link[0]);
  });
}

exports.handle = function handler(event, context) {
  const lastDay = new Date().getTime() - (24 * 60 * 60 * 1000);
  const params = {
    TableName: 'browses',
    FilterExpression: 'published > :lday',
    ExpressionAttributeValues: {
      ':lday': lastDay,
    },
  };

  /*
   * Scan browses table for last 24 hours worth of data.
   */
  dynamo.scan(params, (err, data) => {
    if (err) {
      context.fail('Internal Error: Failed to scan browses');
    }
    else {
      const rsp = data.Items;
      const links = uniq(rsp.map(function (item) {
        return item.url;
      }));
      const linkObjs = links.map(function (item) {
        return { url: item };
      });

      if (linkObjs.length > 0) {
        const batchParams = {
          RequestItems: {
            links: {
              Keys: linkObjs,
            },
          },
        };
        /*
         * Get interests for the last 24 hours worth of data
         * from the links table.
         */
        dynamo.batchGet(batchParams, (err, data) => {
          if (err) {
            context.fail('Internal Error: Failed to batch get interests.');
          } else {
            const links = data.Responses.links.map(function (item) {
              item.browsers = item.browsers.values;
              return item;
            });
            context.succeed(merge(rsp, links));
          }
        });
      } else {
        context.succeed(links);
      }
    }
  });
};
