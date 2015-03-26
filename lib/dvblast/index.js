'use strict';

var O = require('ose').object(module, 'ose/lib/kind');
exports = O.append('node').exports;

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

/**
 * Currently streaming info
 *
 * @property current
 * @type Object
 */

/**
 * List of pledges
 *
 * @property current.pledges
 * @type Array
 */

/**
 * Streaming to ip and port specified by this property. If not specified, streaming is in multicast mode.
 * {
 *   ip: {String},
 *   port: {Number}
 * }
 *
 * @property current.ucast
 * @type {Object}
 */

/**
 * Currently streamed multiplex entry
 *
 * @property current.mplex
 * @type Object
 */

/**
 * List of currently streaming channel entries
 *
 * @property current.channels
 * @type Array
 */

/**
 * Configuration file content
 *
 * @property current.config
 * @type String
 */

/**
 * `aim` has the same structure as `current`. This property indicates that the requested streaming is not yet started. When both properties are defined, `current` is finishing and gets replaced with `aim` after streaming starts.
 *
 * @property aim
 * @type Object
 */

/**
 * Process handler
 *
 * @property ps
 * @type Object
 */

/**
 * Path to the dvblast configuration file
 *
 * @property configFile
 * @type String
 */

/**
 * Reference to the multicast address pool entry
 *
 * @property mcast
 * @type String
 */

/**
 * Currently requesting pledge, assures pledges requests serialization
 *
 * @property pledge
 * @type Object
 */

// Public {{{1
exports.init = function() {  // {{{2
  this.on('pledge', './pledge');
};

exports.homeInit = function(entry) {  // {{{2
  entry.pledges = [];
  entry.data.mcast && entry.find(entry.data.mcast, function(err, mcast) {
    if (err) {
      O.log.error(err);
    } else {
      entry.mcast = mcast;
    }
  });
};

exports.cleanup = function(entry) {  // {{{2
  cleanPledges(entry)

  this.kill(entry);
};

exports.applyAim = function(entry) {  // {{{2
  if (! entry.aim) {
    cb(O.error(entry, 'There is no aim'));
    return;
  }

  cleanPledges(entry)

  entry.current = entry.aim;
  delete entry.aim;

  for (var i = 0; i < entry.current.pledges.length; i++) {
    delete entry.current.pledges[i].aim;
  }

  this.spawn(entry, O._.noop);
  return;
};

exports.removePledge = function(entry, pledge) {  // {{{2
  delete pledge.entry;

  if (pledge.aim && entry.aim) {
    entry.aim.pledges = O._.without(entry.aim.pledges, pledge);
    if (entry.aim.pledges.length) {
      return;
    }

    delete entry.aim;
    return;
  }

  if (! entry.current) return;

  entry.current.pledges = O._.without(entry.current.pledges, pledge);

  if (entry.current.pledges.length) {
    return;
  }

  delete entry.current;

  this.kill(entry);
};

// }}}1
// Private {{{1
function cleanPledges(entry) {  // {{{2
  var list = entry && entry.current && entry.current.pledges;

  if (! list) return;

  for (var i = 0; i < list.length; i++) {
    O.link.close(list[i], null, true);
  }
  return;
}

// }}}1
