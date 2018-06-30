/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const DNS_RESOLUTION_RTT_MULTIPLIER = 1.5;

module.exports = class DNSCache {
  /**
   * @param {{rtt: number}} options
   */
  constructor(options) {
    this._options = Object.assign(
      {
        rtt: undefined,
      },
      options
    );

    if (!this._options.rtt) {
      throw new Error('Cannot create DNS cache with no rtt');
    }

    this._rtt = this._options.rtt;
    /** @type {Map<string, {resolvedAt: number}>} */
    this._resolvedDomainNames = new Map();
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} request
   * @param {number=} requestedAt
   * @return {number}
   */
  getTimeUntilResolution(request, requestedAt) {
    const shouldUpdateCache = typeof requestedAt === 'undefined';
    requestedAt = requestedAt || 0;

    const domain = request.parsedURL.host;
    const cacheEntry = this._resolvedDomainNames.get(domain);
    let timeUntilResolved = this._rtt * DNS_RESOLUTION_RTT_MULTIPLIER;
    if (cacheEntry) {
      const timeUntilCachedIsResolved = Math.max(cacheEntry.resolvedAt - requestedAt, 0);
      timeUntilResolved = Math.min(timeUntilCachedIsResolved, timeUntilResolved);
    }

    const resolvedAt = requestedAt + timeUntilResolved;
    if (shouldUpdateCache) this._updateCacheResolvedAtIfNeeded(request, resolvedAt);

    return timeUntilResolved;
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} request
   * @param {number} resolvedAt
   */
  _updateCacheResolvedAtIfNeeded(request, resolvedAt) {
    const domain = request.parsedURL.host;
    const cacheEntry = this._resolvedDomainNames.get(domain) || {resolvedAt};
    cacheEntry.resolvedAt = Math.min(cacheEntry.resolvedAt, resolvedAt);
    this._resolvedDomainNames.set(domain, cacheEntry);
  }

  /**
   * Forcefully sets the DNS resolution time for a record.
   * Useful for testing and alternate execution simulations.
   *
   * @param {string} domain
   * @param {number} resolvedAt
   */
  setResolvedAt(domain, resolvedAt) {
    this._resolvedDomainNames.set(domain, {resolvedAt});
  }

  static get RTT_MULTIPLIER() {
    return DNS_RESOLUTION_RTT_MULTIPLIER;
  }
};
