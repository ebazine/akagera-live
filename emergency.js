/* Emergency numbers for Akagera National Park, Rwanda.
   Checked November 2026 against:
   - gov.rw/emergency and police.gov.rw (national numbers)
   - africanparks.org/the-parks/akagera/contact (park lines)
   - Lodge numbers: Google listings, akagerasafari.com
   - Rwinkwavu Hospital: UK government "Rwanda: list of medical facilities"
   Numbers can change. Edit this file to update them; the app picks them up on the next load. */
window.EMERGENCY = {
  checked: 'November 2026',
  national: [
    {n:'112', name:'Emergency', note:'Police and all emergencies. Free. May connect through any network that has coverage, even with no credit.', big:true},
    {n:'912', name:'Ambulance', note:'Medical emergency and ambulance.', big:true},
    {n:'113', name:'Traffic accident', note:'Rwanda National Police, road accidents.'},
    {n:'111', name:'Fire', note:'Fire brigade, for example a bush or vehicle fire.'},
    {n:'110', name:'Boat or lake emergency', note:'Maritime problems, for example on Lake Ihema.'}
  ],
  park: [
    {n:'+250786182871', show:'+250 786 182 871', name:'Akagera National Park', note:'Main park line (African Parks). Reception and rangers.', big:true},
    {n:'+250784911955', show:'+250 784 911 955', name:'Akagera tourism office', note:'Bookings and visitor questions.'},
    {n:'+250787113300', show:'+250 787 113 300', name:'Ruzizi Tented Lodge and Karenge Bush Camp', note:'African Parks lodges.'},
    {n:'+250785201206', show:'+250 785 201 206', name:'Mantis Akagera Game Lodge', note:'Lodge near Lake Ihema, in the south.'}
  ],
  medical: [
    {n:'+250788358810', show:'+250 788 358 810', name:'Rwinkwavu Hospital', note:'On the road to the south gate. Number from the UK government list; call ahead to confirm.'}
  ],
  kinds: [
    {id:'broken', label:'Vehicle broken down', icon:'🛠️', warn:true, call:'park'},
    {id:'stuck',  label:'Vehicle stuck (mud, sand)', icon:'🚙', warn:true, call:'park'},
    {id:'flat',   label:'Flat tyre', icon:'🛞', warn:true, call:'park'},
    {id:'accident', label:'Accident', icon:'💥', warn:true, call:'112'},
    {id:'medical', label:'Someone is ill or hurt', icon:'🚑', warn:false, call:'912'},
    {id:'animal', label:'Dangerous animal close', icon:'🐘', warn:false, call:'park'},
    {id:'lost', label:'Lost, no fuel or out of time', icon:'🧭', warn:true, call:'park'}
  ],
  wait: [
    'Stay in the vehicle with the doors locked and windows up. Lions, elephants, buffalo and hippos are all in the park.',
    'Switch on the hazard lights. Put the warning triangle behind the car only if no animals are in sight.',
    'Call the park line, then share your position with the message below.',
    'A flat tyre: do not get out if any animal is within 200 m. Call the park first and ask for advice.',
    'Save battery: lower the screen brightness and close other apps. Calls and SMS use less power than data.',
    'No signal: send an SMS (it can get through where calls fail) and try again every few minutes. If the road is busy, other visitors may pass and can call for you.',
    'Do not walk for help. Give the park your position and they can send someone to you.'
  ]
};
