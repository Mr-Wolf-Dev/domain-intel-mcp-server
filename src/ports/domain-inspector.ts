export interface RawDnsData {
  mxRecords: string[];
  txtRecords: string[];
  dmarcRecords: string[];
}

export interface RawHomepageData {
  finalUrl: string;
  httpStatus: number;
  headers: Record<string, string>;
  html: string;
}

export interface DomainInspector {
  inspectDns(domain: string): Promise<RawDnsData>;
  fetchHomepage(domain: string): Promise<RawHomepageData | null>;
}
