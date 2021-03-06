/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable global-require */

const assert = require('assert');
const funcUtils = require('./util.js');

const duts = funcUtils.getHostInfo();
const firstDut = duts[0];

describe('System tests', () => {
    let installedPackages = [];
    let availablePacakges = {};
    let postedBigIpRunTimeInitDeclaration = {};
    let installedExtDeclarations = [];

    before(function () {
        this.timeout(80000);
        return funcUtils.getAuthToken(firstDut.ip, firstDut.port, firstDut.username, firstDut.password)
            .then((data) => {
                const options = funcUtils.makeOptions({ authToken: data.token });
                options.port = firstDut.port;
                firstDut.authData = data;
                return funcUtils.queryPackages(firstDut.ip, firstDut.port, data.token);
            })
            .then((data) => {
                if (data && data.queryResponse) {
                    installedPackages = data.queryResponse;
                }
                return funcUtils.getPackagesMetadata();
            })
            .then((data) => {
                if (data && data.components) {
                    availablePacakges = data;
                }
                return funcUtils.getDeclaration();
            })
            .then((data) => {
                postedBigIpRunTimeInitDeclaration = data;
                const promises = [];
                for (
                    let idx = 0;
                    idx < postedBigIpRunTimeInitDeclaration.extension_services.service_operations.length;
                    idx += 1) {
                    promises.push(funcUtils.getInstalledDeclaration(
                        firstDut.ip,
                        firstDut.port,
                        firstDut.authData.token,
                        postedBigIpRunTimeInitDeclaration.extension_services.service_operations[idx].extensionType
                    ));
                }
                return Promise.all(promises);
            })
            .then((response) => {
                installedExtDeclarations = response.filter(item => item);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should verify AS3 installed', () => {
        const declaredAs3Version = postedBigIpRunTimeInitDeclaration.extension_packages.install_operations.filter(item => item.extensionType === 'as3')[0].extensionVersion;
        const delaredPackageName = availablePacakges.components.as3.versions[declaredAs3Version].packageName;

        assert.ok(installedPackages.filter(item => item.name === 'f5-appsvcs').length > 0);
        assert.ok(installedPackages.filter(item => item.packageName === delaredPackageName).length > 0);
        assert.ok(installedPackages.filter(item => item.version === declaredAs3Version).length > 0);
    });

    it('should verify DO installed', () => {
        const declatedDoVersion = postedBigIpRunTimeInitDeclaration.extension_packages.install_operations.filter(item => item.extensionType === 'do')[0].extensionVersion;
        const delaredPackageName = availablePacakges.components.do.versions[declatedDoVersion].packageName;

        assert.ok(installedPackages.filter(item => item.name === 'f5-declarative-onboarding').length > 0);
        assert.ok(installedPackages.filter(item => item.packageName === delaredPackageName).length > 0);
        assert.ok(installedPackages.filter(item => item.version === declatedDoVersion).length > 0);
    });

    it('should verify successfully installed declarations', () => {
        assert.strictEqual(
            postedBigIpRunTimeInitDeclaration.extension_services.service_operations.length,
            installedExtDeclarations.length
        );
    });
});
