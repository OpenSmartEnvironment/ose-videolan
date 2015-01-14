'use strict';

var Ose = require('ose');
var M = Ose.module(module);

var Ucast = M.class('./ucast');
//var Mcast = M.class('./mcast');

/** Docs {{{1
 * @module videolan
 */

/**
 * @class videolan.lib.dvblast
 */

// Public {{{1
exports.init = function() {  // {{{2
  this.on('pledge', pledge);
};

exports.homeInit = function(entry) {  // {{{2
  entry.queueStateTimeout = 0;
};

// }}}1
// Private {{{1
function pledge(req, socket) {  // {{{2
/**
 * Registers media player
 *
 * @param req {Object} Request data
 * @param socket {Object} Slave socket
 *
 * @method pledge
 */

  new Ucast(this.entry, req, socket);
};

// }}}1
