'use strict';

var O = require('ose').class(module, C);

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
function C(entry, req, socket) {  // {{{2
/**
 * Socket constructor
 *
 * @param entry {Object} DVBlast entry
 * @param req {Object} Request
 * @param req.channel {Object} Channel entry identification
 * @param req.mplex {String} Multiplex id
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
    throw O.error(entry, 'Client socket can\'t be opened');
  }

  var that = this;

  this.entry = entry;

  doit();
  return;

  function doit() {  // {{{3
    if (! O.link.canOpen(socket)) return;

    if (entry.boon) {  // Serialize multiple boon requests
      entry.once('afterBoon', doit);
      return;
    }
    entry.boon = that;

    if (entry.aim) {
      if (compat(entry.aim)) {
        open(true);
        return;
      }
      close();
      return;
    }

    if (! entry.current) {
      buildAim();
      return;
    }

    if (compat(entry.current)) {
      open();
      return;
    }

    if (
      entry.current.boons.length === 1 &&
      O._.isEqual(req.playback, entry.current.boons[0].playback)
    ) {
      buildAim();
      return;
    }

    close();
    return;
  }

  function buildAim() {  // {{{3
    var counter;
    var aim = {
      config: [],
      channels: [],
      boons: [],
    };

    if (! entry.mcast || ! entry.mcast.isIdentified(req.mcast)) {
      aim.ucast = req.ucast;
    }

    var id = O._.clone(req.channel);
    id.id = req.mplex;

    O.findEntry(id, function(err, mplex) {  // {{{4
      if (check(err)) return;

      aim.mplex = mplex;

      if (aim.ucast) {
        mplex.shard.get(req.channel.id, onUcastChannel);
        return;
      }

      mplex.shard.getMap(
        {
          kind: 'dvbChannel',
          // full: true; TODO: Implement this
          filter: {
            mplex: mplex.id,
          }
        },
        onMap
      );

      return;
    });

    function onMap(err, resp) {  // {{{4
      if (check(err)) return;

      counter = O.counter();

      for (var i = 0; i < resp.map.length; i++) {
        counter.inc();
        aim.mplex.shard.get(resp.map[i], onChannel);
      }

      counter.done(done);
      return;
    }

    function onUcastChannel(err, ch) {  // {{{4
      if (check(err)) return;

      aim.channels.push(ch);
      aim.config.push(aim.ucast.ip + ':' + aim.ucast.port + '/epg 1 ' + ch.data.number);

      done();
      return;
    }

    function onChannel(err, ch) {  // {{{4
      if (! err) {
        aim.channels.push(ch);
        aim.config.push(ch.data.ip + ':5004/epg 1 ' + ch.data.number);
        if (ch.id === req.channel.id) {
          that.mcast = ch.data.ip;
        }
      }

      counter.dec();
    }

    function done() {  // {{{4
      aim.config = aim.config.join('\n');
      entry.aim = aim;

      open(true);
    }

    // }}}4
  }

  function compat(s) {  // {{{3
    if (req.mplex !== s.mplex.id) return false;
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

    return true
  }

  function inChannels(ident, list) {  // {{{3
    for (var i = 0; i < list.length; i++) {
      var ch = list[i];
      if (ch.isIdentified(ident)) {
        that.mcast = ch.data.ip;
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

exports.split = function(err) {  // {{{2
  this.close();
};

exports.error = function(err) {  // {{{2
  O.log.error(err);

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
