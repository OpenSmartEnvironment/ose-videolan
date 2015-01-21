'use strict';

var Ose = require('ose');
var M = Ose.singleton(module, 'ose/lib/kind');
exports = M.append('node').exports;

/** Docs {{{1
 * @module videolan
 */

/**
 * @caption DVBlast kind
 *
 * @readme
 * [Entry kind] allowing to control DVBlast software
 *
 * @class videolan.lib.dvblast
 * @main videolan.lib.dvblast
 * @extend ose.lib.kind
 * @type singleton
 */

// Public {{{1
exports.mplex2Config = function(entry, cb) {
  if (entry.dvbChannels) {
    if (entry.dvbChannels === 'building') {
      entry.on('channels', afterBuild);
      return;
    }
    cb(null, entry.dvbConfig);
    return;
  }

  var counter;

  entry.dvbChannels = 'building';
  var r = {};

  entry.dvbMplex.shard.getView(
    {
      kind: 'dvbChannel',
      filter: {
        mplex: entry.dvbMplex.id,
      }
    },
    onView
  );
  return;

  function onView(err, resp) {  // {{{3
    if (err) {
      cb(err);
      return;
    }

    console.log('ON resp', resp);

    counter = Ose.counter();

    for (var i = 0; i < resp.view.length; i++) {
      counter.inc();
      entry.dvbMplex.shard.get(resp.view[i], onChannel);
    }

    counter.done(done);
  }

  function onChannel(err, resp) {  // {{{3
    if (err) {
      counter.dec();
      return;
    }

    entry.mcast.post('getIp', function(err, ip) {
      if (err) {
        counter.dec();
        return;
      }

      r[resp.data.number] = {
        entry: resp,
        address: ip,
      };

      counter.dec();
      return;
    });
    return;
  }

  function done() {  // {{{3
    var c = [];
    for (var key in r) {
      c.push(r[key].address + ':5004 1 ' + key);
    }

    entry.dvbConfig = c.join('\n');
    entry.dvbChannels = r;
    entry.emit('dvbChannels');

    cb(null, entry.dvbConfig);
  }

  // }}}3
};

