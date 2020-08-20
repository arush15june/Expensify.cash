/**
 * This is a higher-order component which determines when the app should be refreshed, and either:
 *  - Refreshes the page if it's currently hidden
 *  OR
 *  - Prompts the user to refresh the page if it's currently visible
 */
import React from 'react';
import AsyncStorage from '@react-native-community/async-storage';

import CONST from './CONST';
import {queueRequest} from '../Network';

const getDisplayName = component => component.displayName || component.name || 'Component';

export default function (WrappedComponent) {
    class withBackgroundRefresh extends React.Component {
        constructor() {
            super();
            this.onVisibilityChange.bind(this);
        }

        componentDidMount() {
            window.addEventListener(CONST.EVENT.VISIBILITY_CHANGE, this.onVisibilityChange());

            // When the page first loads, get the current version hash
            this.getStoredVersionAsync();
        }

        async onVisibilityChange() {
            const pageShouldRefresh = await this.pageShouldRefreshAsync();
            if (pageShouldRefresh) {
                if (document.visibilityState === CONST.STATE.HIDDEN) {
                    // Refresh page w/o browser cache
                    window.location.reload(true);
                } else if (document.visibilityState === CONST.STATE.VISIBLE) {
                    // TODO: Notify user that they should refresh the page
                }
            }
        }

        /**
         * Get stored git hash, or if there is none then fetch the remote git hash and save it to LocalStorage.
         */
        async getStoredVersionAsync() {
            const storedVersion = await AsyncStorage.getItem(CONST.KEY_VERSION_HASH);
            if (!storedVersion) {
                // only get the remote version if there is no version locally stored
                const remoteVersion = await queueRequest(CONST.COMMAND.GET_VERSION_HASH);
                AsyncStorage.setItem(CONST.KEY_VERSION_HASH, remoteVersion);
            }
        }

        /**
         * Fetch the remote git hash, and compare it to the one stored in LocalStorage.
         *
         * If they are the same:
         *  - save the updated version in LocalStorage
         *  - return false
         *
         * Else return true
         *
         * @returns {boolean}
         */
        async pageShouldRefreshAsync() {
            const storedVersion = await AsyncStorage.getItem(CONST.KEY_VERSION_HASH);

            // If the app is offline, this request will hang indefinitely.
            // But that's okay, because it couldn't possibly refresh anyways.
            const remoteVersion = await queueRequest(CONST.COMMAND.GET_VERSION_HASH);

            if (storedVersion === remoteVersion) {
                if (!storedVersion) {
                    await AsyncStorage.setItem(CONST.KEY_VERSION_HASH, remoteVersion);
                }
                return false;
            }

            return true;
        }

        render() {
            return <WrappedComponent />;
        }
    }

    withBackgroundRefresh.displayName = getDisplayName(WrappedComponent);
    return withBackgroundRefresh;
}