/*
 * getUserBrowseData
 *
 * Get a particular browsers browsing history and interests.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses/{browser}
 * @method: GET
 *
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
  for (var key in b)
    if (b.hasOwnProperty(key)) {
      a[key] = b[key];
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
  const params = {
    TableName: 'browses',
    KeyConditionExpression: 'browser = :bsr',
    ExpressionAttributeValues: {
      ':bsr': event.browser,
    },
  };
  /*
   * Query entries in browses table for browsers browses.
   */
  dynamo.query(params, function (err, data) {
    if (err) {
      context.fail('Internal Error: Failed to query database.');
    }
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
       * Batch get all of browsers interests from links table.
       */
      dynamo.batchGet(batchParams, function (err, data) {
        if (err) {
          context.fail('Internal Error: Failed to batch get interests');
        } else {
          var links = data.Responses.links.map(function (item) {
            item.browsers = item.browsers.values;
            return item;
          });
          links = links.map(function (item) {
            if (item.hasOwnProperty('useful')) {
              item.useful = item.useful.values;
            }
            if (item.hasOwnProperty('interesting')) {
              item.interesting = item.interesting.values;
            }
            if (item.hasOwnProperty('entertaining')) {
              item.entertaining = item.entertaining.values;
            }
            return item;
          });
          context.succeed(merge(rsp, links));
        }
      });
    } else {
      context.succeed(links);
    }
  });
};
