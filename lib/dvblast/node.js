'use strict';

var Ose = require('ose');
var M = Ose.module(module);

var Master = M.class('./master');

/** Docs {{{1
 * @module videolan
 */

/**
 * @class videolan.lib.dvblast
 */

// Public {{{1
exports.init = function() {  // {{{2
  this.on('register', register);
};

exports.homeInit = function(entry) {  // {{{2
  entry.queueStateTimeout = 0;
};

// }}}1
// Private {{{1
function register(req, socket) {  // {{{2
/**
 * Registers media player
 *
 * @param req {Object} Request data
 * @param socket {Object} Slave socket
 *
 * @method register
 */

  new Master(this.entry, socket);
};

// }}}1
