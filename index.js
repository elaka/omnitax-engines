'use strict';

/**
 * omnitax-engines — root namespace export.
 *
 * Every engine remains available as a direct deep import, e.g.
 *   require('omnitax-engines/engines/decimal-math')
 * The namespace below is the convenient, stable entry point.
 */

module.exports = {
  decimalMath: require('./engines/decimal-math'),
  statutoryXml: require('./engines/statutory-xml-validator'),
  gateways: require('./engines/gateway-simulator'),
  wormLedger: require('./engines/worm-merkle-ledger'),
  tenantGuard: require('./engines/tenant-rls-guard'),
  idempotency: require('./engines/idempotency')
};
