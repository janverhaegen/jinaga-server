import { Handler, Request } from 'express';
import { Authorization, AuthorizationNoOp, AuthorizationRules, Cache, Feed, FeedImpl, Jinaga, Keystore, MemoryStore, Storage, SyncStatusNotifier, TransientFork, UserIdentity, WebClient } from 'jinaga';
import { AuthenticationDevice } from './authentication/authentication-device';
import { AuthenticationSession } from './authentication/authentication-session';
import { AuthorizationKeystore } from './authorization/authorization-keystore';
import { NodeHttpConnection } from './http/node-http';
import { HttpRouter, RequestUser } from './http/router';
import { PostgresKeystore } from './postgres/postgres-keystore';
import { PostgresStore } from './postgres/postgres-store';

export type JinagaServerConfig = {
    pgStore?: string,
    pgKeystore?: string,
    httpEndpoint?: string,
    authorization?: (a: AuthorizationRules) => AuthorizationRules,
    httpTimeoutSeconds?: number
};

export type JinagaServerInstance = {
    handler: Handler,
    j: Jinaga,
    withSession: (req: Request, callback: ((j: Jinaga) => Promise<void>)) => Promise<void>
};

const localDeviceIdentity = {
    provider: 'jinaga',
    id: 'local'
};

export class JinagaServer {
    static create(config: JinagaServerConfig): JinagaServerInstance {
        const syncStatusNotifier = new SyncStatusNotifier();
        const store = createStore(config);
        const feed = new FeedImpl(store);
        const fork = createFork(config, feed, syncStatusNotifier);
        const authorization = createAuthorization(config, fork);
        const router = new HttpRouter(authorization);
        const keystore = new PostgresKeystore(config.pgKeystore);
        const authentication = new AuthenticationDevice(fork, keystore, localDeviceIdentity);
        const memory = new MemoryStore();
        const j: Jinaga = new Jinaga(authentication, memory, syncStatusNotifier);
        return {
            handler: router.handler,
            j,
            withSession: (req, callback) => {
                return withSession(feed, keystore, req, callback);
            }
        }
    }
}

function createStore(config: JinagaServerConfig): Storage {
    if (config.pgStore) {
        const store = new PostgresStore(config.pgStore);
        const cache = new Cache(store);
        return cache;
    }
    else {
        return new MemoryStore();
    }
}

function createFork(config: JinagaServerConfig, feed: Feed, syncStatusNotifier: SyncStatusNotifier): Feed {
    if (config.httpEndpoint) {
        const httpConnection = new NodeHttpConnection(config.httpEndpoint);
        const httpTimeoutSeconds = config.httpTimeoutSeconds || 5;
        const webClient = new WebClient(httpConnection, syncStatusNotifier, {
            timeoutSeconds: httpTimeoutSeconds
        });
        const fork = new TransientFork(feed, webClient);
        return fork;
    }
    else {
        return feed;
    }
}

function createAuthorization(config: JinagaServerConfig, feed: Feed): Authorization {
    if (config.pgKeystore) {
        const keystore = new PostgresKeystore(config.pgKeystore);
        const authorizationRules = config.authorization ? config.authorization(new AuthorizationRules()) : null;
        const authorization = new AuthorizationKeystore(feed, keystore, authorizationRules);
        return authorization;
    }
    else {
        return new AuthorizationNoOp(feed);
    }
}

async function withSession(feed: Feed, keystore: Keystore, req: Request, callback: ((j: Jinaga) => Promise<void>)) {
    const user = <RequestUser>req.user;
    const userIdentity: UserIdentity = {
        provider: user.provider,
        id: user.id
    }
    const authentication = new AuthenticationSession(feed, keystore, userIdentity, user.profile.displayName, localDeviceIdentity);
    const syncStatusNotifier = new SyncStatusNotifier();
    const j = new Jinaga(authentication, new MemoryStore(), syncStatusNotifier);
    await callback(j);
}