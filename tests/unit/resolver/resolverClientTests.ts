/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable global-require */
import assert from 'assert';
import sinon from 'sinon';
import { ResolverClient } from '../../../src/lib/resolver/resolverClient';

describe('Resolver Client', () => {
    let runtimeParameters;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        runtimeParameters = [
            {
                name: 'AWS_PASS',
                type: 'secret',
                secretProvider: {
                    type: 'SecretsManager',
                    environment: 'aws',
                    version: 'AWSCURRENT',
                    secretId: 'secert-document'
                }
            },
            {
                name: 'AZURE_PASS',
                type: 'secret',
                secretProvider: {
                    type: 'SecretClient',
                    environment: 'azure',
                    version: '6e86876be4ce46a49ec578dfda897593',
                    secretId: 'this-secret',
                    debug: true
                }
            },
            {
                name: 'AZURE_HOST_NAME',
                type: 'metadata',
                metadataProvider: {
                    type: 'compute',
                    environment: 'azure',
                    field: 'name'
                }
            },
            {
                name: 'AZURE_SELF_IP',
                type: 'metadata',
                metadataProvider: {
                    type: 'network',
                    environment: 'azure',
                    field: 'ipv4',
                    index: 1
                }
            },
            {
                name: 'SOME_NAME',
                type: 'static',
                value: 'SOME VALUE'
            }
        ];
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        const resolver = new ResolverClient();
        assert.strictEqual(typeof resolver, 'object');
    });

    it('should validate resolveRuntimeParameters', () => {
        const resolver = new ResolverClient();
        resolver._resolveSecret = sinon.stub().resolves('StrongPassword2010+');
        resolver._resolveMetadata = sinon.stub().resolves('');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.ok(Object.keys(results).length === 3);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
                assert.strictEqual(results.AWS_PASS, 'StrongPassword2010+');
                assert.strictEqual(results.AZURE_PASS, 'StrongPassword2010+');
            });
    });

    it('should validate resolveRuntimeParameters no secret match', () => {
        const resolver = new ResolverClient();
        resolver._resolveSecret = sinon.stub().resolves('');
        resolver._resolveMetadata = sinon.stub().resolves('ru65wrde-vm0');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.ok(Object.keys(results).length === 3);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
                assert.strictEqual(results.AZURE_HOST_NAME, 'ru65wrde-vm0');
            });
    });

    it('should validate self IP metadata resolveRuntimeParameters', () => {
        const resolver = new ResolverClient();
        resolver._resolveSecret = sinon.stub().resolves('');
        resolver._resolveMetadata = sinon.stub().resolves('10.0.1.4/24');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.ok(Object.keys(results).length === 3);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
                assert.strictEqual(results.AZURE_SELF_IP, '10.0.1.4/24');
            });
    });

    it('should validate resolveRuntimeParameters no parameter match', () => {
        const resolver = new ResolverClient();
        resolver._resolveSecret = sinon.stub().resolves('');
        resolver._resolveMetadata = sinon.stub().resolves('');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.ok(Object.keys(results).length === 1);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
            });
    });

    it('should validate unknown runtime parameter case', () => {
        const resolver = new ResolverClient();
        runtimeParameters = [
            {
                name: 'AWS_PASS',
                type: 'wrong',
                secretProvider: {
                    type: 'SecretsManager',
                    environment: 'aws',
                    version: 'AWSCURRENT',
                    secretId: 'secert-document'
                }
            },
            {
                name: 'AZURE_PASS',
                type: 'wrong',
                secretProvider: {
                    type: 'SecretClient',
                    environment: 'azure',
                    version: '6e86876be4ce46a49ec578dfda897593',
                    secretId: 'this-secret',
                    debug: true
                }
            },
            {
                name: 'AZURE_HOST_NAME',
                type: 'wrong',
                metadataProvider: {
                    type: 'compute',
                    environment: 'azure',
                    field: 'name'
                }
            },
            {
                name: 'SOME_NAME',
                type: 'static',
                value: 'SOME VALUE'
            }
        ];

        resolver.resolveRuntimeParameters(runtimeParameters)
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Runtime parameter type is unknown'));
            });
    });
});
