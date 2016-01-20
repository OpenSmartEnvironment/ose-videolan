'use strict';

const O = require('ose')(module)
  .class(init)
;

var Kind = require('./index');

/** Doc {{{1
 * @module videolan
 */

/**
 * @caption DVB streaming boon response socket
 *
 * @readme
 * [Response socket] responsible for maintaining media stream 
 *
 * @class videolan.lib.dvblast.boon
 * @type class
 */

// Public {{{1
function init(entry, req, socket) {  // {{{2
/**
 * Socket constructor
 *
 * @param entry {Object} DVBlast entry
 * @param req {Object} Request
 * @param req.channel {Object} Channel entry identification
 * @param req.playback {Object} Playback entry identification
 * @param req.mcast {Object} Multicast pool identification
 * @param req.ucast {Object} Unicast destination ip address
 * @param req.ucast.ip {Object} Unicast destination ip address
 * @param req.ucast.port {Object} Unicast destination port
 * @param socket {Object} Boon client socket
 *
 * @method constructor
 */

  if (! O.link.canOpen(socket)) {
    throw O.log.error(entry, 'Client socket can\'t be opened');
  }

  var that = this;
  var aim = {
    config: [],
    boons: [],
    channels: [],
  };

  this.entry = entry;

  doit();

  function doit() {  // {{{3
    if (! O.link.canOpen(socket)) return;

    // Serialize multiple boon requests
    if (entry.boon) return entry.once('afterBoon', doit);
    entry.boon = that;

    if (entry.aim) {
      if (compat(entry.aim)) {
        return open(true);
      }
      return close();
    }

    if (! entry.current) return findEntries();

    if (compat(entry.current)) return open();

    if (
      entry.current.boons.length === 1 &&
      O._.isEqual(req.playback, entry.current.boons[0].playback)
    ) {
      return findEntries();
    }

    return close();
  }

  function findEntries() {  // {{{3
    O.data.findEntry(req.channel, function(err, entry) {
      if (check(err)) return;

      aim.channel = entry;

      return entry.shard.find(entry.dval.mplex, function(err, entry) {
        if (check(err)) return;

        aim.mplex = entry;

        return buildAim();
      });
    });
  }

  function buildAim() {  // {{{3
    if (! entry.mcast || ! entry.mcast.isIdentified(req.mcast)) {
      aim.ucast = req.ucast;
    }

    if (aim.ucast) {
      aim.channels.push(aim.channel);
      aim.config.push(aim.ucast.ip + ':' + aim.ucast.port + '/epg 1 ' + aim.channel.dval.number);

      return done();
    }

    return aim.mplex.shard.query(  // {{{4
      {
        kind: 'dvbChannel',
        filter: {
          mplex: aim.mplex.id,
        }
      },
      function(err, resp) {
        if (check(err)) return;

        aim.channels = [];
        return O.async.each(resp.map, function(val, cb) {
          aim.mplex.shard.get(val, function(err, ch) {
            if (! err) {
              aim.channels.push(ch);
              aim.config.push(ch.dval.ip + ':5004/epg 1 ' + ch.dval.number);
              if (ch.id === req.channel.id) {
                that.mcast = ch.dval.ip;
              }
            }

            cb();
          });
        }, done);
      }
    );

    function done() {  // {{{4
      aim.config = aim.config.join('\n');
      entry.aim = aim;

      open(true);
    }

    // }}}4
  }

  function compat(s) {  // {{{3
    if (aim.mplex !== s.mplex) return false;
    if (! inChannels(req.channel, s.channels)) return false;

    if (s.ucast) {
      if (! req.ucast) return false;
      if (! O._.isEqual(req.ucast, s.ucast)) return false;
    }

    return true;
  }

  function check(err) {  // {{{3
    if (O.link.canClose(socket)) {
      if (! err) return false;
      O.link.error(socket, err);
    }

    return true;
  }

  function inChannels(ident, list) {  // {{{3
    for (var i = 0; i < list.length; i++) {
      var ch = list[i];
      if (ch.isIdentified(ident)) {
        that.mcast = ch.dval.ip;
        return true;
      }
    }

    return false;
  }

  function close() {  // {{{3
    if (O.link.canClose(socket)) {
      O.link.close(socket);
    }

    delete entry.boon;
    entry.emit('afterBoon');
  }

  function open(aim) {  // {{{3
    var resp = {};

    that.playback = req.playback;

    if (aim) {
      that.aim = true;
      entry.aim.boons.push(that);
      resp.count = entry.aim.boons.length;
      resp.ucast = entry.aim.ucast;
    } else {
      entry.current.boons.push(that);
      resp.count = entry.current.boons.length;
      resp.ucast = entry.current.ucast;
    }

    O.link.open(that, socket, resp);

    delete entry.boon;
    entry.emit('afterBoon');
  }

  // }}}3
};

exports.close = function(req) {  // {{{2
  Kind.removeBoon(this.entry, this);
};

exports.error = function(err) {  // {{{2
  if (! err.splitError) {
    O.log.error(err);
  }

  this.close();
};

exports.stream = function(req, socket) {  // {{{2
/**
 * `stream` [command handler]
 *
 * @param req {Object} Stream to be connected to
 *
 * @method stream
 */

  var e = this.entry;
  if (e.aim) {
    Kind.applyAim(e);
  }

  O.link.close(socket, e.current.ucast || {
    ip: this.mcast,
    port: 5004,
  });
};

// }}}1
