import { Observable } from '../feed/feed';
import { Channel } from "../fork/channel";
import { Fork } from "../fork/fork";
import { LoginResponse } from '../http/messages';
import { Keystore } from '../keystore';
import { Query } from '../query/query';
import { Specification } from "../specification/specification";
import { FactEnvelope, FactRecord, FactReference } from '../storage';
import { UserIdentity } from "../user-identity";
import { Authentication } from './authentication';

export class AuthenticationDevice implements Authentication {
    constructor(
        private inner: Fork,
        private keystore: Keystore,
        private localDeviceIdentity: UserIdentity
    ) {}

    async close(): Promise<void> {
        await this.inner.close();
        await this.keystore.close();
    }

    async login(): Promise<LoginResponse> {
        throw new Error('No logged in user.');
    }

    async local(): Promise<FactRecord> {
        return await this.keystore.getOrCreateDeviceFact(this.localDeviceIdentity);
    }

    from(fact: FactReference, query: Query): Observable {
        return this.inner.from(fact, query);
    }

    save(envelopes: FactEnvelope[]): Promise<FactEnvelope[]> {
        return this.inner.save(envelopes);
    }

    query(start: FactReference, query: Query): Promise<FactReference[][]> {
        return this.inner.query(start, query);
    }

    read(start: FactReference[], specification: Specification): Promise<any[]> {
        return this.inner.read(start, specification);
    }

    whichExist(references: FactReference[]): Promise<FactReference[]> {
        throw new Error("whichExist method not implemented on AuthenticationDevice.");
    }

    load(references: FactReference[]): Promise<FactRecord[]> {
        return this.inner.load(references);
    }

    addChannel(fact: FactReference, query: Query): Channel {
        return this.inner.addChannel(fact, query);
    }

    removeChannel(channel: Channel): void {
        return this.inner.removeChannel(channel);
    }
}