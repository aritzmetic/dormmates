import {useEffect,useState} from 'react';
import {motion} from 'framer-motion';

// Bump this number to make EVERYONE (new and existing users) see the guide once again.
export const TOUR_V=2;

// ---------------------------------------------------------------------------------------------
// HOW-TO GUIDE  (plain-language, page by page)
//
// Every step is one object:
//   pg   : the page/section name shown above the title ("Home", "Bills"...). Steps with the same pg are grouped.
//   tab  : which bottom tab to open while this step is showing
//   sel  : CSS selector of the thing to spotlight (the data-tour="..." markers in App/Fixes/Settings). Optional.
//   ic   : emoji
//   t    : title
//   b    : one short intro sentence
//   pts  : bullet points. Wrap words in **double stars** to make them bold.
//   who  : 'host' = only the host sees this step, 'member' = only non-hosts see it, left out = everyone
//
// To change the wording of the guide, edit the text below. Then bump TOUR_V above if you want everyone to see it again.
// ---------------------------------------------------------------------------------------------
const steps=owner=>[

 // ================= START =================
 {pg:'Start',tab:'home',ic:'👋',t:'Welcome to DormMate',
  b:'DormMate keeps track of who is home, so the electric and water bills can be split fairly. This guide walks you through every page. It takes about 5 minutes.',
  pts:['**The idea:** tap **Time in** when you get home and **Time out** when you leave.',
   'The app adds up everyone\'s hours. Whoever spent more time home pays a bigger part of the bill.',
   owner?'You are the **host**, so you will also see steps marked **Host only**. They explain how to run the space and the bills.':'You are a **member**. You will only see the steps that apply to you.',
   'Tap **Next** to go on. You can also use **Skip this page** or **Skip guide** at any time.']},

 {pg:'Start',tab:'home',ic:'📖',t:'Words you will see',
  b:'A few simple words that appear all over the app.',
  pts:['**Space**: your group, for example "Room 304" or "Our apartment". You can be in more than one.',
   '**Host**: the person who runs the space and the bills. The one who creates a space is the host.',
   '**Member**: everyone else in the space (also called dormmates).',
   '**Cycle**: one billing month. It starts on a day the host picks and ends the day before the next one.',
   '**Punch**: one tap of Time in or Time out.',
   '**Proof**: the picture or location you send with a punch so dormmates know it is real.',
   '**Fix**: a correction you ask for when you forgot to punch or pressed it by mistake.']},

 {pg:'Start',tab:'home',ic:'📲',t:'Put it on your home screen',
  b:'DormMate works best when installed like a normal app.',
  pts:['Open the website in your phone browser, open the browser menu and tap **Add to Home Screen**.',
   '**iPhone:** this step is required for notifications. Always open DormMate from the icon on your Home Screen.',
   'The first time, the app also asks to use your **camera**, **location** and **notifications**. Tap Allow, otherwise punching with proof and reminders will not work.']},

 {pg:'Start',tab:'home',sel:'[data-tour=spaces]',ic:'🏠',t:'Your space and invite code',
  b:'The name at the top left is your space. Tap it to switch spaces.',
  pts:['The first time you sign in with Google, you either **create a space** (type a name, you become the host) or **join one** by typing the 6-letter invite code you were given.',
   'Tapping the name opens your list of spaces. There you can switch, create another one, join another one, and see or copy the invite code.',
   'Your picture at the top right opens **Settings**.',
   owner?'**To invite people:** give them your 6-letter code. You can copy or share it here or in Settings → Space.':'**To join a dorm:** ask the host for the 6-letter code, then type it in "Join with a code".']},

 {pg:'Start',tab:'home',sel:'[data-tour=nav]',ic:'🧭',t:'The bottom menu',
  b:'Six pages. This guide visits each one.',
  pts:['🏠 **Home**: punch in and out, see your hours.',
   '👥 **Dorm**: who is home right now, plus the notice board.',
   '🕘 **History**: charts and a list of everyone\'s time.',
   '📝 **Fixes**: correct a forgotten or mistaken punch.',
   '💡 **Bills**: see (or create) the electric and water split.',
   '⚙️ **Settings**: reminders, theme, space options and your account.',
   owner?'A small **red number** on Fixes means requests are waiting for your decision.':'A small **red number** on Fixes means the host suggested a correction that is waiting for your answer.']},

 {pg:'Start',tab:'home',ic:'🗓️',t:'Choose when your cycle starts',who:'host',
  b:'When you create a space, a pop-up asks which day the billing cycle starts. If you have not seen it yet, it appears as soon as this guide ends.',
  pts:['Pick the day of the month (1 to 28) that your electric and water bill period begins.',
   'Hours, fixes and bills are counted from that day until the day before the next one. Example: start day 14 means the 14th to the 13th of next month.',
   'You can change it later in **Settings → Space**. Bills you already saved keep their old dates.']},

 // ================= HOME =================
 {pg:'Home',tab:'home',sel:'[data-tour=hero]',ic:'⏳',t:'Your hours this cycle',
  b:'The big card at the top of Home is your summary.',
  pts:['The large number is **how long you have been home** during this cycle.',
   'The little chip shows how many dormmates are home right now, for example "2 of 4 home".',
   'Use **‹ ›** at the top to look at earlier or later cycles. The punch button only shows for the current cycle.']},

 {pg:'Home',tab:'home',sel:'[data-tour=punch]',ic:'⏱',t:'Time in and Time out',
  b:'This big button is the heart of the app.',
  pts:['Tap it when you **arrive** (Time in). It turns into **Time out** and shows a running clock while you are home.',
   'After you tap, choose your proof: **📸 Take a picture** (selfie camera, you can flip it) or **📍 Send my location**.',
   'Your dormmates get a notification, and your status updates on the Dorm page.',
   'Forgot to tap, or tapped by mistake? No problem. Use the **Fixes** page (later in this guide).']},

 {pg:'Home',tab:'home',sel:'[data-tour=away]',ic:'🌙',t:'The 8:00 PM auto time-in',
  b:'After you time out, the app assumes you will be back home by 8:00 PM, unless you say otherwise.',
  pts:['After you time out, a card appears on Home called **"Auto time-in at 8:00 PM"**.',
   'If you are staying out, tap **"I\'m still away"** between **7:30 and 8:00 PM** and send a picture or location. You get a reminder at 7:30 PM.',
   'If you do **not** confirm, the app times you in at 8:00 PM and marks it **"auto"** so everyone can see it.',
   'You must confirm again each evening you are still away. Timing in yourself before 8:00 PM also cancels it.',
   '(This card only appears after you have timed out, so you may not see it highlighted right now.)']},

 {pg:'Home',tab:'home',sel:'[data-tour=board]',ic:'🏆',t:'Cycle leaderboard',
  b:'Everyone\'s hours this cycle, longest at the top.',
  pts:['The 👑 goes to whoever has the most hours.',
   'It is not a contest. It simply shows why the bill is split the way it is: **more hours home means a bigger usage share**.']},

 // ================= DORM =================
 {pg:'Dorm',tab:'dorm',sel:'[data-tour=dorm]',ic:'👥',t:'Who\'s home',
  b:'A live list of everyone in the space.',
  pts:['A **green dot** means in, with how long they have been home. Otherwise it shows **Out** and when they left.',
   'Their proof appears beside their name. Tap a **picture** to enlarge it, or tap **📍** to open the location on a map.',
   '"Confirmed still away" means they answered the 8:00 PM check. "Auto time-in" means they did not.',
   owner?'**Host:** the **✕** button next to a member removes them from the space (it asks you to confirm first).':'The host is marked "host" next to their name.']},

 {pg:'Dorm',tab:'dorm',sel:'[data-tour=notes]',ic:'📌',t:'Announcements and notice board',
  b:'Where the dorm talks to each other.',
  pts:['**Notice board:** type a note and tap **Post**. Everyone gets a notification. It keeps the latest 30 notes.',
   'You can delete your own notes with **✕**. The host can delete any note.',
   '**Announcements** (with the 📣) appear above the notice board. Only the host can send them.',
   owner?'**Host:** send an announcement from Settings → Host tools. You can remove old ones with ✕ here.':'Announcements are for things like "Water will be off at 3 PM".']},

 // ================= HISTORY =================
 {pg:'History',tab:'history',sel:'[data-tour=chart]',ic:'📊',t:'Hours chart',
  b:'See how many hours were logged each day of the cycle.',
  pts:['With **Everyone** selected, each bar is the **average per member** for that day.',
   'Tap a **name** above the chart to see only that person.',
   'Tap any **bar** to see the exact hours for that day. The total for the cycle is under the chart.',
   'Use **‹ ›** to look at other cycles.']},

 {pg:'History',tab:'history',sel:'[data-tour=log]',ic:'📋',t:'Time logged',
  b:'The full list of sessions. A session is one Time in to the next Time out.',
  pts:['Each entry shows who, the date, the start and end time, and how long. Proof pictures and locations are shown too.',
   '**"approved fix"** means the time was corrected through the Fixes page.',
   '**"started last cycle"** or **"continues next cycle"** means the session crossed the cycle change day. Each cycle only counts its own part.',
   'Something looks wrong? Go to **Fixes**.']},

 // ================= FIXES =================
 {pg:'Fixes',tab:'fixes',sel:'[data-tour=fixcal]',ic:'📅',t:'The Fixes calendar',
  b:'Forgot to time in or out? This is where you correct your hours.',
  pts:['The calendar shows the cycle. The **fill** in each day shows how many hours were logged, and a **yellow** day has a request waiting.',
   'Tap any day (past or today) to open it. Future days cannot be tapped.',
   owner?'As host you can also look at **other people\'s** punches (see Counter-check below).':'Anything you send goes to the host for approval.']},

 {pg:'Fixes',tab:'fixes',sel:'[data-tour=fixcal]',ic:'✏️',t:'Four ways to fix a day',
  b:'After you tap a day you see that day\'s sessions and four choices.',
  pts:['**Edit**: change the start or end time of a session. (You can also **Remove** a session you pressed by mistake.)',
   '**Time in + out**: add a whole session you forgot. Works for several days at once: set the time in on the first day and the time out on the last day. Each day becomes its own request.',
   '**Time in only**: "I forgot to time in." It counts until your next time out.',
   '**Time out only**: "I forgot to time out." It ends your open session at the time you pick.',
   'The time boxes start at **12:00 AM** and end at **11:59 PM**. Change them if needed. Then type a short **reason** and send. The app shows a preview of the hours first. A time out cannot be in the future.']},

 {pg:'Fixes',tab:'fixes',sel:'[data-tour=fixreq]',ic:'📬',t:'Requests',who:'member',
  b:'Everything you sent shows up here.',
  pts:['**Pending** (yellow): waiting for the host. You will be notified when it is decided. You can tap **Cancel request** while it is pending.',
   '**Approved**: your hours have changed. **Denied**: nothing changed.',
   'A request that covers several days shows as one card. Tap **Review day by day** to see each day on its own.',
   '**Suggested** 💡: the host spotted something and suggests a correction to your hours. It does nothing until you tap **Accept**. Tap **Decline** to ignore it. You will also see a yellow notice at the top of the page.',
   'You can filter the list by person and by status using the chips above it.']},

 {pg:'Fixes',tab:'fixes',sel:'[data-tour=fixreq]',ic:'📬',t:'Requests',who:'host',
  b:'Members\' requests show up here, and you decide each one.',
  pts:['Tap **Approve** or **Deny**. The member is notified. Each day of a multi-day request can be decided on its own, or tap **Approve all / Deny all**.',
   'Changed your mind? Tap **↩ Undo decision** to move it back to pending.',
   'Your own fixes are **approved instantly** (you can turn that off in Settings → Fix request rules).',
   'Corrections you suggested show as **Suggested** until the member accepts. You can **Withdraw** one before they answer.',
   'Filter by person and by status with the chips. The red number on the Fixes tab counts requests waiting for you.']},

 {pg:'Fixes',tab:'fixes',sel:'[data-tour=fixdl]',ic:'⏳',t:'Fix deadline',who:'host',
  b:'Stop late requests by setting a cut-off for the cycle.',
  pts:['Pick a date and time, then tap **Save deadline**. After that moment nobody can send new fix requests for this cycle.',
   'Everyone is notified when you set it, and again shortly before it closes.',
   'Tap **Remove** to take the deadline away.',
   'Once you **finalize** the bills for a cycle, it is locked too (see Bills).']},

 {pg:'Fixes',tab:'fixes',sel:'[data-tour=counter]',ic:'🔍',t:'Counter-check',who:'host',
  b:'Double-check anyone\'s punches and suggest a correction.',
  pts:['Tap a member\'s name to see all their punches this cycle, with picture or location proof.',
   'Tap **Review** on a punch to open that day on the calendar. A banner reminds you whose hours you are viewing.',
   'Anything you change there is only a **suggestion**. Their hours do not change until **that member accepts it**.',
   'Tap **Me** to go back to your own hours.']},

 // ================= BILLS =================
 {pg:'Bills',tab:'bills',sel:'[data-tour=bills]',ic:'⏰',t:'The bill summary',who:'member',
  b:'The top card shows the period, the deadline and the countdown.',
  pts:['It shows how many **days are left** to pay, or **Overdue**, plus the dates covered and the cost per day.',
   'Use **‹ ›** to see other periods.',
   'Until the host sends the bills you will see "The host hasn\'t sent this period\'s bills yet". You get a notification when they do.',
   'Yellow notices can appear: **fix requests still pending** (totals may change once they are decided) or **someone is still timed in** (their hours keep counting).',
   'DormMate does not move money. Pay the host the way your dorm usually does. The host marks you as **Paid** and you get a notification.']},

 {pg:'Bills',tab:'bills',sel:'[data-tour=bills]',ic:'⏰',t:'The bill summary',who:'host',
  b:'The top card shows the period, the deadline and the countdown.',
  pts:['It shows how many **days are left** to pay, or **Overdue**, plus the dates covered and the cost per day.',
   'Use **‹ ›** to see other periods. Warnings appear if fix requests are still pending or someone is still timed in. Resolve those before finalizing.',
   'If nobody has any hours for the period, the app warns you and offers **"Calculate by days"** (explained next).']},

 {pg:'Bills',tab:'bills',sel:'[data-tour=billform]',ic:'🧮',t:'Enter the bills',who:'host',
  b:'Fill in the form, then tap Save draft & calculate.',
  pts:['Type the **Electric** and **Water** amounts (₱). The period dates are filled in for you. Change them if your bill covers other dates.',
   '**Payment deadline**: follows your default from Settings unless you pick a date for this bill only.',
   '**Base contribution %** and **Who pays the base**: see "How shares are computed" next.',
   '**Calculate by days**: for a past period where nobody punched. Tick it and type how many days each person was in the dorm.',
   'Tap **Save draft & calculate**. This is **private**. Dormmates cannot see anything yet.']},

 {pg:'Bills',tab:'bills',sel:'[data-tour=billshare]',ic:'➗',t:'How shares are computed',
  b:'Each bill is split in two parts, so it is fair to everyone.',
  pts:['**1. Base pool**: a percentage of the bill (for example 25%) that is split **equally** among the "fixed" members, the people the host chose to pay the base. Think of it as the cost of simply having the room.',
   '**2. Usage pool**: everything left over, split by **hours at home** among everyone. More hours means a bigger share.',
   '**Example:** a ₱2,000 bill, 25% base, Ana and Ben both fixed. Base ₱500, so ₱250 each. Usage ₱1,500. Ana was home 300 hours and Ben 100, so Ana pays ₱1,125 and Ben ₱375. Totals: Ana ₱1,375, Ben ₱625.',
   'If **no one** is chosen as fixed, 100% of the bill is split by hours.',
   'Cents are handled so everyone\'s shares add up exactly to the bill.']},

 {pg:'Bills',tab:'bills',sel:'[data-tour=billdraft]',ic:'📨',t:'Check, then send',who:'host',
  b:'Your saved numbers appear in a yellow Draft card.',
  pts:['Look over the hours and amounts. Nothing has been shared yet.',
   'Happy? Tap **📨 Send to dormmates**. Everyone is notified and can see their share right away.',
   'Not happy? Tap **Discard draft**, or change the form and save again.',
   'You can fix and resend later. Members keep seeing the last version you sent until you send the new one.']},

 {pg:'Bills',tab:'bills',sel:'[data-tour=billpeople]',ic:'👤',t:'Everyone\'s share',who:'member',
  b:'One card per person, so everything is open and fair.',
  pts:['Each card shows the **amount**, their **hours** and percent of the total, and how it breaks down into **Base + Usage**.',
   '⚡ is the electric part and 💧 is the water part.',
   'A **fixed** tag means that person pays the base contribution. **Paid** means the host received the payment. **Overdue** means it is past the deadline.',
   'The **Export CSV** button at the bottom downloads the table as a spreadsheet.']},

 {pg:'Bills',tab:'bills',sel:'[data-tour=billpeople]',ic:'👤',t:'Collect payments',who:'host',
  b:'Once the bills are sent, each person has a card.',
  pts:['Tap **Mark paid** when someone pays you. They get a notification. Tap again to undo.',
   'Tap **🔔 Remind unpaid members** for a friendly nudge. The app also reminds people automatically as the deadline gets near and when it is overdue.',
   'Each card shows hours, percent, **Base + Usage** and the ⚡ electric and 💧 water parts. **Export CSV** downloads everything as a spreadsheet.']},

 {pg:'Bills',tab:'bills',sel:'[data-tour=billtot]',ic:'🔒',t:'Finalize and send receipts',who:'host',
  b:'When the cycle is over and everything looks right, lock it.',
  pts:['**Finalize** (🔒) once everyone is timed out and all fix requests are decided. It locks the hours so nothing can change, and notifies everyone.',
   'Then tap **🧾 Generate & send receipts**. Each member gets a PDF receipt showing exactly how their share was worked out. They see only their own.',
   'You can **view** or **download** any receipt, or download all in one PDF.',
   'Need to change something? Tap **Reopen**. This deletes the receipts, so tap **Regenerate & resend** afterwards.',
   '**Order to remember:** enter bills → Save draft → Send → collect payments → Finalize → Send receipts.']},

 {pg:'Bills',tab:'bills',sel:'[data-tour=billrcpt]',ic:'🧾',t:'Your receipt',who:'member',
  b:'When the host finalizes the cycle and sends receipts, yours appears at the bottom of Bills.',
  pts:['Tap **View my receipt** to read it, or **Download PDF** to keep a copy.',
   'It shows every step: the bill, the base share, the usage share, your hours and the total you owe.',
   '🔒 **Finalized** means the hours for that cycle are locked and cannot be changed anymore.']},

 // ================= SETTINGS =================
 {pg:'Settings',tab:'settings',ic:'⚙️',t:'Settings overview',
  b:'Everything you can change lives here, in sections you tap to open.',
  pts:['The top card shows who you are signed in as, and whether you are **Host** or **Member**.',
   'Tap a section\'s title to open it. Only one is open at a time.',
   owner?'As host you can change every section, and you have one extra section: **Host tools**.':'Sections about the space show a **🔒 "Only the host can change these"** note. You can read them, but only the host can change them.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=set-space]',ic:'🏠',t:'Space',who:'member',
  b:'About your space.',
  pts:['See the space name, when the cycle starts, the **invite code** (Copy or Share it to invite a friend), and who is in the space.',
   '**Switch, create or join a space** opens your list of spaces.',
   '**Leave** takes you out of this space. Your past hours stay in the group records. If the host leaves, the next member becomes host.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=set-space]',ic:'🏠',t:'Space',who:'host',
  b:'Your main controls as host.',
  pts:['**Space name** and **billing cycle start day**: change them and tap **Save space**.',
   '**Invite code**: Copy, Share, or tap **New** to make a fresh one. The old code stops working.',
   '**Members**: **Make host** hands your controls to someone else (you become a normal member). **✕** removes a member.',
   '**Leave**, or **Delete this space for everyone**. Deleting erases all punches, fixes, bills and notes forever. You must type the space name to confirm.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=set-fixes]',ic:'📝',t:'Fix request rules',who:'member',
  b:'The rules the host set for fixes.',
  pts:['Shows whether you must give a reason, how many days back you can ask, and the most days allowed in one request.',
   'If a day is locked (🔒), it is outside those rules or the cycle has closed.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=set-fixes]',ic:'📝',t:'Fix request rules',who:'host',
  b:'Decide how strict fixes should be.',
  pts:['**Host\'s own fixes are approved instantly**: turn off if you want your fixes to need approval too.',
   '**Require a reason**: members must explain every request.',
   '**How far back**: no limit, or 3, 7, 14 or 31 days.',
   '**Most days in one request**: a long request is split into one per day, so each day can be decided separately.',
   'Tap **Save fix rules**. The deadline for a particular cycle is set on the Fixes page.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=set-bills]',ic:'💡',t:'Bill defaults',who:'member',
  b:'How your dorm usually splits bills.',
  pts:['Shows the base contribution %, who pays the base (the fixed members) and which day of the month payment is due.',
   'These are the starting values for every new bill. The host can still change one bill on its own.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=set-bills]',ic:'💡',t:'Bill defaults',who:'host',
  b:'Set these once so you do not retype them each month.',
  pts:['**Base contribution %** and **who pays the base** (the fixed members).',
   '**Payment due day**: the day of the month after the cycle ends.',
   'When you save, bills that are not finalized yet are updated too (unless you set a custom value on that bill), and dormmates are told. **Finalized bills never change.**']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=alerts]',ic:'🔔',t:'Notifications & reminders',
  b:'Turn these on so you do not forget to punch.',
  pts:['Tap **Enable notifications** and allow them on your phone. Use **Send a test** to check your phone, and **Test a push from the server** to check that real reminders can reach you.',
   '**Remind me to time in / time out**: pick a time. A time-in reminder is skipped if you are already in, and a time-out reminder is skipped if you are already out.',
   '**Alert me if I stay timed in too long**: pick 4 to 24 hours, in case you forgot to time out.',
   '**Repeat on**: choose the days. Changes save by themselves. Tap **Send me a confirmation** to get a "Reminders set" notice right away.',
   'The 7:30 PM "confirm you are away" alert is automatic and cannot be turned off.',
   'If you see **"The reminder timer is not running"**, reminders only reach you while the app is open. '+(owner?'Set up the 5-minute timer described in the README (Setting up reminders).':'Ask the host to set up the timer.')]},

 {pg:'Settings',tab:'settings',sel:'[data-tour=alerts]',ic:'📣',t:'What you will be notified about',
  b:'Notifications from your dorm, even when the app is closed.',
  pts:['A dormmate times in, times out, or is auto timed in.',
   'New notice board posts and host announcements.',
   'Bills sent, bills finalized, receipts ready, payment received, due-soon and overdue reminders.',
   owner?'A member sends a fix request, or accepts or declines your suggested correction.':'Your fix request is approved or denied, the host suggests a correction, or a fix deadline is set or about to close.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=look]',ic:'🌗',t:'Appearance',
  b:'Choose how the app looks.',
  pts:['**Light**, **Dark** or **System** (follows your phone\'s setting).',
   'This is saved on this phone only.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=help]',ic:'❓',t:'Help',
  b:'Want to see this guide again?',
  pts:['Open **Help** and tap **▶ Play the How-To guide** any time.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=host]',ic:'📣',t:'Host tools',who:'host',
  b:'Send a message to everyone at once.',
  pts:['Type up to 140 characters, for example "Water will be off at 3 PM", then tap **Send notification**.',
   'Everyone gets a push notification, and it also shows under **Announcements** on the Dorm page.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=data]',ic:'📦',t:'Export data',
  b:'Download your records as spreadsheets (CSV files).',
  pts:['**Hours & sessions** and **Fix requests**, for the cycle you are looking at.',
   owner?'As host, you get everyone\'s data.':'You get your own data.',
   'CSV files open in Excel, Google Sheets or Numbers.']},

 {pg:'Settings',tab:'settings',sel:'[data-tour=account]',ic:'👤',t:'Account',
  b:'Sign in and out.',
  pts:['**Switch account** signs you out and lets you sign in with another Google account.',
   '**Sign out** logs you out of this phone.',
   '**Delete my account** removes your account and takes you out of all your spaces. Your past hours stay in the group records. This cannot be undone.']},

 // ================= FINISH =================
 {pg:'Finish',tab:'home',ic:'✅',t:'Quick recap',last:true,
  b:owner?'Your routine as host, in short:':'Your routine as a member, in short:',
  pts:owner?['**Every day:** Time in when you get home, Time out when you leave. Confirm "still away" before 8:00 PM if you are out.',
    '**During the cycle:** decide fix requests, and use Counter-check if something looks off.',
    '**End of the cycle:** enter the bills, save the draft, send it, collect payments, finalize, then send receipts.',
    'Lost? **Settings → Help** replays this guide.']
   :['**Every day:** Time in when you get home, Time out when you leave. Confirm "still away" before 8:00 PM if you are out.',
    'Forgot something? Send a request on the **Fixes** page.',
    'When the host sends the bills, open **Bills** to see your share and your receipt.',
    'Lost? **Settings → Help** replays this guide.']}
];

// **bold** markers -> <b>
const rich=s=>String(s).split('**').map((p,k)=>k%2?<b key={k}>{p}</b>:p);
const WHO={host:['Host only','host'],member:['Members','member']};

export default function Tour({owner,setTab,onDone,onLater}){
 const S=steps(owner).filter(s=>!s.who||(s.who==='host')===!!owner),[i,setI]=useState(0),[ack,setAck]=useState(false),[rect,setRect]=useState(null),st=S[i],last=i===S.length-1;
 const grp=S.filter(s=>s.pg===st.pg),gi=grp.indexOf(st)+1,nextPg=S.findIndex((s,k)=>k>i&&s.pg!==st.pg);
 useEffect(()=>{
  setRect(null);if(st.tab)setTab(st.tab);
  const measure=()=>{const el=st.sel&&document.querySelector(st.sel);if(!el){setRect(null);return}const b=el.getBoundingClientRect();setRect({x:b.left-6,y:b.top-6,w:b.width+12,h:b.height+12})};
  let n=0;const timers=[];
  const t=setInterval(()=>{n++;const el=st.sel&&document.querySelector(st.sel);
   if(el){clearInterval(t);
    // Settings sections are collapsible: open the one we are talking about
    if(el.classList.contains('acc-wrap')&&!el.querySelector('.accb'))el.querySelector('.acch')?.click();
    timers.push(setTimeout(()=>{el.scrollIntoView({block:el.getBoundingClientRect().height>innerHeight*.5?'start':'center',behavior:'smooth'})},90));
    timers.push(setTimeout(measure,620))}
   else if(n>25)clearInterval(t)},100);
  addEventListener('resize',measure);addEventListener('scroll',measure,true);
  return()=>{clearInterval(t);timers.forEach(clearTimeout);removeEventListener('resize',measure);removeEventListener('scroll',measure,true)}},[i]);
 const top=rect&&rect.y>innerHeight*.5,w=WHO[st.who]||['Everyone',''];
 return <>
  <div className="tour-block"/>
  {rect?<div className="tour-hl" style={{left:rect.x,top:rect.y,width:rect.w,height:rect.h}}/>:<div className="tour-dim"/>}
  <motion.div key={i} className="tour-card" style={top?{top:'calc(12px + env(safe-area-inset-top))'}:{bottom:'calc(84px + env(safe-area-inset-bottom))'}} initial={{opacity:0,y:top?-16:16}} animate={{opacity:1,y:0}}>
   <div className="tour-body">
   <div className="tour-bar"><i style={{width:(i+1)/S.length*100+'%'}}/></div>
   <div className="row sp" style={{marginBottom:6}}><span className="tour-pg">{st.pg}{grp.length>1?` · ${gi} of ${grp.length}`:''}</span><span className={`tour-who ${w[1]}`}>{w[0]}</span></div>
   <div className="row" style={{gap:10,alignItems:'center'}}><div className="tour-ic">{st.ic}</div><h3>{st.t}</h3></div>
   <p className="tour-b">{st.b}</p>
   {st.pts&&<ul className="tour-pts">{st.pts.map((p,k)=><li key={k}>{rich(p)}</li>)}</ul>}
   </div>
   <div className="tour-foot">
   {last?<>
    <label className="chk" style={{padding:'4px 0 12px'}}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I understand how to use DormMate.</label>
    <button className="pri w" disabled={!ack} onClick={onDone}>Finish guide</button>
    <div className="row" style={{marginTop:8}}><button className="sm" style={{flex:1}} onClick={()=>setI(i-1)}>‹ Back</button><button className="sm" style={{flex:1}} onClick={onLater}>Ask me next time</button></div></>
   :<><div className="row"><span style={{flex:1}}/>{i>0&&<button className="sm" onClick={()=>setI(i-1)}>‹ Back</button>}<button className="pri" onClick={()=>setI(i+1)}>Next ›</button></div>
    <div className="row sp" style={{marginTop:10}}>{nextPg>0?<button className="tour-link" onClick={()=>setI(nextPg)}>Skip this page</button>:<span/>}<button className="tour-link" onClick={()=>setI(S.length-1)}>Skip guide</button></div></>}
   </div>
  </motion.div></>}
