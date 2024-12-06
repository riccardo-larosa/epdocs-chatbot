
import { testMongoDBConnection } from '@/utils/mongoDbTest';

export default function TestConnection() {
    testMongoDBConnection();
    return <div>Test Connection</div>;
}