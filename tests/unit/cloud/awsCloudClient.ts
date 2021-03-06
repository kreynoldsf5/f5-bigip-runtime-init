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
import { AwsCloudClient } from '../../../src/lib/cloud/aws/cloudClient';
const cloud = 'aws';

describe('CloudClient - AWS', () => {
    let cloudClient;
    let metadataPathRequest;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        cloudClient = new AwsCloudClient();
        cloudClient.secretsManager = sinon.stub();
        cloudClient.secretsManager.getSecretValue = sinon.stub().callsFake(() => ({
            promise(): Promise<object>{
                return Promise.resolve({ SecretString: 'StrongPassword2010!' });
            }
        }));
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, callback) => {
                metadataPathRequest = path;
                callback(null, JSON.stringify({
                    region: 'some-aws-region',
                    instanceId: 'some-instance-id',
                    secretsManager: sinon.stub()
                }));
            });
        cloudClient.logger = sinon.stub();
        cloudClient.logger.info = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        assert.strictEqual(cloudClient.environment, cloud);
    });

    it('should validate init', () => {
        cloudClient._getInstanceIdentityDoc = sinon.stub().resolves({
            region: 'some-aws-region',
            instanceId: 'some-instance-id'
        });
        return cloudClient.init()
            .then(() => {
                assert.strictEqual(cloudClient.region, 'some-aws-region');
            });
    });

    it('should validate init metadata request promise rejection', () => {
        cloudClient._getInstanceIdentityDoc = sinon.stub().rejects(new Error('Test Rejection'));
        return cloudClient.init()
            .then(() => {
                assert.ok(false);
            }).catch((err) => {
                assert.ok(err.message.includes('Test Rejection'));
            });
    });

    it('should call _getInstanceIdentityDoc to get instance data', () => cloudClient._getInstanceIdentityDoc()
        .then(() => {
            assert.strictEqual(metadataPathRequest, '/latest/dynamic/instance-identity/document');
        })
        .catch(() => {
            assert.fail();
        }));

    it('should reject upon error', () => {
        const expectedError = 'cannot contact AWS metadata service';
        return cloudClient.init()
            .then(() => {
                // eslint-disable-next-line arrow-body-style
                cloudClient._metadata.request = sinon.stub()
                    .callsFake((path, callback) => {
                        callback(new Error(expectedError));
                    });
                return cloudClient._getInstanceIdentityDoc();
            })
            .then(() => {
                assert.ok(false, 'should have rejected');
            })
            .catch((err) => {
                assert.strictEqual(err.message, expectedError);
            });
    });

    it('should validate getSecret when secret exists', () => cloudClient.getSecret(
        'the-secret-name', {
            version: 'some-version'
        }
    )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret exists and version default used', () => cloudClient.getSecret(
        'the-secret-name'
    )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret does not exists', () => {
        cloudClient.secretsManager.getSecretValue = sinon.stub().callsFake(() => ({
            promise(): Promise<void> {
                return Promise.resolve();
            }
        }));
        cloudClient.getSecret(
            'incorrect-secret-name',
            {
                version: 'some-version'
            }
        )
            .then((secret) => {
                assert.strictEqual(secret, '');
            });
    });

    it('should validate getSecret promise rejection', () => {
        cloudClient.secretsManager.getSecretValue = sinon.stub().callsFake(() => ({
            promise(): Promise<void> {
                return Promise.reject(new Error('Test rejection'));
            }
        }));
        return cloudClient.getSecret(
            'incorrect-secret-name',
            {
                version: 'some-version'
            }
        )
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Test rejection'));
            });
    });

    it('should validate getSecret throws error when secret metadata is not provided', () => {
        cloudClient.getSecret().catch((err) => {
            if (err.message.includes('secert id is missing')) {
                assert.ok(true);
            }
        });
    });
});
