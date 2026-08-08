declare module '*.raw.ts' {
    const code: string
    export default code
}
interface Window {
    darkmode: {
        fromStorage: string | null;
        real: boolean;
        apply(): void;
    }
}
