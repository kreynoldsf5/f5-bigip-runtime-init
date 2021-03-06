/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import * as assert from 'assert';
import * as cloudFactory from '../../../src/lib/cloud/cloudFactory';
describe('Cloud Factory', () => {
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should get each available cloud provider', async () => {
        ['aws', 'azure', 'gcp'].forEach(async (cloud) => {
            const cloudClient = await cloudFactory.getCloudProvider(cloud);
            assert.strictEqual(cloudClient.environment, cloud);
        });
    });

    it('should  get unsupported cloud provider', () => {
        return cloudFactory.getCloudProvider('foo').catch((err) => {
            assert.ok(err.message.includes('Unsupported cloud'));
        });
    });
});
