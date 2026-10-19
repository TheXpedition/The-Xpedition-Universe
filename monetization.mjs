export const publicContactEmail='lopezvillegasdavid01@gmail.com';
export const registeredPublisher='ca-pub-3803322129950825';
export function monetizationConfig(env=process.env){
 const configuredPublisher=env.ADSENSE_PUBLISHER_ID??registeredPublisher;
 const publisher=/^ca-pub-\d{16}$/.test(configuredPublisher)?configuredPublisher:'',slot=/^\d{6,20}$/.test(env.ADSENSE_DISPLAY_SLOT||'')?env.ADSENSE_DISPLAY_SLOT:'';
 return {contactEmail:publicContactEmail,adsense:{publisher,slot,enabled:!!publisher&&!!slot&&env.ADSENSE_ENABLED==='true'&&env.ADSENSE_SITE_APPROVED==='true'&&env.ADSENSE_CONSENT_READY==='true'}};
}
export const adsText=config=>config.adsense.publisher?'google.com, '+config.adsense.publisher.slice(3)+', DIRECT, f08c47fec0942fa0\n':null;
