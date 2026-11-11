import type { ActivityEvent, CallLog, Lead, Profile, TaskItem } from "@/types/database";
import { daysFromNow } from "@/lib/utils";

export const CURRENT_USER_ID = "u1";

export const MOCK_STAFF: Profile[] = [
  { id:"u1", full_name:"Rachel Kapoor",   email:"rachel@fortuneworld.tours", role:"admin", title:"Director of Operations", avatar_color:"from-blue-500 to-indigo-600",   status:"online" },
  { id:"u2", full_name:"Miriam Slater",   email:"miriam@fortuneworld.tours",  role:"staff", title:"Ticketing",             avatar_color:"from-rose-400 to-pink-600",    status:"online" },
  { id:"u3", full_name:"Harris Whitaker", email:"harris@fortuneworld.tours",  role:"staff", title:"Visa Specialist",       avatar_color:"from-amber-400 to-orange-600", status:"busy"   },
  { id:"u4", full_name:"Priya Nair",      email:"priya@fortuneworld.tours",   role:"staff", title:"Senior Consultant",     avatar_color:"from-emerald-400 to-teal-600", status:"online" },
  { id:"u5", full_name:"Leo Martins",     email:"leo@fortuneworld.tours",     role:"staff", title:"Flight Operations",     avatar_color:"from-violet-400 to-purple-600",status:"offline"},
];

const wa = (msgs: [("client"|"agent"), string, number][]) =>
  msgs.map(([from, text, h], i) => ({ id:`m${i}`, from, text, at: daysFromNow(-h/24) }));

export const MOCK_LEADS: Lead[] = [
  { id:"l1", client_name:"Aarav Mehta",      email:"aarav.mehta@gmail.com",   phone:"+61 412 884 201", origin_iata:"SYD", destination_iata:"DXB", travel_date:daysFromNow(34), return_date:daysFromNow(48), passengers:2, budget:9400,  stage:"contacted",   source:"whatsapp", assigned_to:"u2", progress:22, comments:4,  summary:"Honeymoon in Dubai — wants Burj Khalifa view hotel, 5-star.", notes:"First contact via WhatsApp. Flexible ±2 days.", whatsapp:wa([["client","Hi! We want to plan our honeymoon to Dubai ✨",26],["agent","Congrats! Emirates has great SYD→DXB directs.",25]]), created_at:daysFromNow(-2) },
  { id:"l2", client_name:"Sofia Bennett",    email:"sofia.b@outlook.com",     phone:"+61 430 556 982", origin_iata:"MEL", destination_iata:"SIN", travel_date:daysFromNow(21), return_date:daysFromNow(28), passengers:4, budget:11200, stage:"contacted",   source:"meta_ads", assigned_to:"u4", progress:15, comments:2,  summary:"Family of 4 — Singapore + Sentosa, school-holiday.", notes:"Meta lead. Kids 7 & 11.", whatsapp:wa([["client","Saw your Easter package — is Sentosa included?",8]]), created_at:daysFromNow(-1) },
  { id:"l3", client_name:"Daniel Osei",      email:"d.osei@company.au",       phone:"+61 455 301 114", origin_iata:"SYD", destination_iata:"LHR", travel_date:daysFromNow(15), return_date:daysFromNow(22), passengers:1, budget:7800,  stage:"contacted",   source:"walk_in",  assigned_to:"u2", progress:34, comments:6,  summary:"Business London — needs lounge access.", notes:"Walk-in. Wants QF or BA premium cabin.", whatsapp:wa([["agent","QF1 via Singapore has A380 business availability.",30]]), created_at:daysFromNow(-3) },
  { id:"l4", client_name:"Grace Liu",        email:"grace.liu88@gmail.com",   phone:"+61 421 778 340", origin_iata:"BNE", destination_iata:"HND", travel_date:daysFromNow(42), return_date:daysFromNow(56), passengers:2, budget:6800,  stage:"contacted",   source:"whatsapp", assigned_to:"u4", progress:12, comments:1,  summary:"Tokyo cherry-blossom trip, couple, prefers ANA or JAL.", notes:"Referred by existing client.", whatsapp:wa([["client","Mia told me you booked her Japan trip! We want sakura 🌸",12]]), created_at:daysFromNow(-1) },
  { id:"l5", client_name:"Marcus Webb",      email:"marcus.webb@yahoo.com",   phone:"+61 402 119 667", origin_iata:"PER", destination_iata:"JNB", travel_date:daysFromNow(60), return_date:daysFromNow(75), passengers:2, budget:15500, stage:"negotiation", source:"meta_ads", assigned_to:"u3", progress:55, comments:8,  summary:"South Africa safari — Kruger 6n + Cape Town 4n.", notes:"High-value enquiry. Sent lodge comparison.", whatsapp:wa([["client","Can you beat the lodge's own package price?",50]]), created_at:daysFromNow(-6) },
  { id:"l6", client_name:"Emma Fitzgerald",  email:"emma.fitz@gmail.com",     phone:"+61 438 902 551", origin_iata:"SYD", destination_iata:"CDG", travel_date:daysFromNow(80), return_date:daysFromNow(101),passengers:2, budget:18900, stage:"negotiation", source:"walk_in",  assigned_to:"u2", progress:62, comments:11, summary:"21-day Europe grand tour — Paris, Amalfi, Santorini.", notes:"Debating business class one way only.", whatsapp:wa([["agent","SQ has Premium Economy + Business mix for $9.2k.",72]]), created_at:daysFromNow(-9) },
  { id:"l7", client_name:"Rajesh Kumar",     email:"raj.kumar@bigpond.com",   phone:"+61 410 332 874", origin_iata:"MEL", destination_iata:"DEL", travel_date:daysFromNow(28), return_date:daysFromNow(49), passengers:3, budget:5400,  stage:"negotiation", source:"whatsapp", assigned_to:"u4", progress:48, comments:5,  summary:"Family visit Delhi for wedding — economy, flexible.", notes:"Air India vs SQ comparison sent.", whatsapp:wa([["client","What is best price for 3 people around 3 weeks?",96]]), created_at:daysFromNow(-5) },
  { id:"l8", client_name:"Isabella Rossi",   email:"bella.rossi@icloud.com",  phone:"+61 447 210 398", origin_iata:"SYD", destination_iata:"FCO", travel_date:daysFromNow(55), return_date:daysFromNow(70), passengers:2, budget:13200, stage:"offer_sent",  source:"meta_ads", assigned_to:"u3", progress:74, comments:9,  summary:"Rome + Amalfi anniversary — EK/QF quote sent.", notes:"Quoted Emirates via DXB $12,940 business.", whatsapp:wa([["agent","Quote sent! EK business, 14 nights: $12,940.",26],["client","Looks great — checking leave dates 🙏",25]]), created_at:daysFromNow(-8) },
  { id:"l9", client_name:"Tom Nguyen",       email:"tom.ng@gmail.com",        phone:"+61 409 881 233", origin_iata:"SYD", destination_iata:"SGN", travel_date:daysFromNow(38), passengers:1, budget:2100, stage:"offer_sent",  source:"whatsapp", assigned_to:"u5", progress:80, comments:3,  summary:"Solo HCMC food tour — VN direct quote sent.", notes:"Awaiting passport validity confirmation.", whatsapp:wa([["client","Passport renewed! Send the final quote again please.",20]]), created_at:daysFromNow(-4) },
  { id:"l10",client_name:"Charlotte Hayes",  email:"charlotte.h@me.com",      phone:"+61 435 662 109", origin_iata:"BNE", destination_iata:"NAN", travel_date:daysFromNow(26), return_date:daysFromNow(35), passengers:5, budget:14600, stage:"offer_sent",  source:"walk_in",  assigned_to:"u2", progress:68, comments:7,  summary:"Fiji family escape — Denarau Sofitel 9n.", notes:"Fiji Airways + Sofitel package quoted $14,290.", whatsapp:wa([["agent","Sofitel confirmed interconnecting bures!",33]]), created_at:daysFromNow(-7) },
  { id:"l11",client_name:"Amelia Watson",    email:"amelia.w@gmail.com",      phone:"+61 451 990 382", origin_iata:"MEL", destination_iata:"ICN", travel_date:daysFromNow(-12),return_date:daysFromNow(2),  passengers:2, budget:7400,  stage:"closed_won",  source:"whatsapp", assigned_to:"u2", progress:100,comments:14, summary:"Seoul food + K-culture — TICKETED, returning this week.", notes:"Hotel: Signiel Seoul.", whatsapp:wa([["client","Trip was incredible, thank you!!",18]]), created_at:daysFromNow(-30) },
  { id:"l12",client_name:"Olivia Zhang",     email:"olivia.zhang@icloud.com", phone:"+61 426 551 907", origin_iata:"SYD", destination_iata:"MLE", travel_date:daysFromNow(65), return_date:daysFromNow(74), passengers:2, budget:21500, stage:"negotiation", source:"meta_ads", assigned_to:"u3", progress:40, comments:5,  summary:"Maldives overwater villa — seaplane transfer required.", notes:"Comparing Conrad, Soneva, St. Regis.", whatsapp:wa([["client","Soneva is dream but seaplane $ adds up. Any specials?",30]]), created_at:daysFromNow(-4) },
];

export const MOCK_TASKS: TaskItem[] = [
  { id:"t1", title:"Send revised EK quote to Isabella Rossi",        tag:"Ticketing",   dueLabel:"Due tomorrow", tone:"amber", done:false, assignee:"u3", progress:60,  created_at:daysFromNow(-1) },
  { id:"t2", title:"Chase Schengen insurance docs — Emma Fitzgerald", tag:"Visa",        dueLabel:"Due Oct 12",   tone:"slate", done:false, assignee:"u3", progress:30,  created_at:daysFromNow(-2) },
  { id:"t3", title:"Follow up Meta lead: Sofia Bennett",             tag:"Follow-up",   dueLabel:"Overdue 1d",   tone:"red",   done:false, assignee:"u4", progress:10,  created_at:daysFromNow(-3) },
  { id:"t4", title:"Reconfirm Signiel Seoul airport transfer",        tag:"Operations",  dueLabel:"Due today",    tone:"blue",  done:false, assignee:"u5", progress:80,  created_at:daysFromNow(-1) },
  { id:"t5", title:"Lodge rate negotiation call — Kruger supplier",   tag:"Supplier",    dueLabel:"Due Oct 14",   tone:"slate", done:false, assignee:"u1", progress:15,  created_at:daysFromNow(-2) },
  { id:"t6", title:"Upload April Meta Ads creative set",              tag:"Marketing",   dueLabel:"Done",         tone:"green", done:true,  assignee:"u1", progress:100, created_at:daysFromNow(-5) },
];

export const MOCK_CALLS: CallLog[] = [
  { id:"c1", lead_id:"l8", lead_name:"Isabella Rossi", staff_id:"u3", direction:"outbound", phone:"+61 447 210 398", duration_seconds:372, disposition:"connected",  notes:"Walked through EK quote. Happy with it.", created_at:daysFromNow(-1) },
  { id:"c2", lead_id:"l5", lead_name:"Marcus Webb",    staff_id:"u3", direction:"inbound",  phone:"+61 402 119 667", duration_seconds:541, disposition:"connected",  notes:"Pushed for private safari vehicle.", created_at:daysFromNow(-1.2) },
  { id:"c3", lead_id:"l3", lead_name:"Daniel Osei",    staff_id:"u2", direction:"outbound", phone:"+61 455 301 114", duration_seconds:0,   disposition:"no_answer", notes:"Voicemail left re: QF A380.", created_at:daysFromNow(-2) },
];

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id:"a1", kind:"quote",   text:"Miriam attached EK Business quote ($12,940) to Isabella Rossi", at:daysFromNow(-0.9)  },
  { id:"a2", kind:"call",    text:"Harris logged outbound call with Marcus Webb (9m 01s)",          at:daysFromNow(-1.1)  },
  { id:"a3", kind:"webhook", text:"Meta Lead Ads ingested: Sofia Bennett — MEL → SIN",             at:daysFromNow(-1.35) },
  { id:"a4", kind:"stage",   text:"James O'Connor moved to Offer Sent by Priya",                   at:daysFromNow(-1.6)  },
  { id:"a5", kind:"lead",    text:"New WhatsApp inquiry: Aarav Mehta — SYD → DXB honeymoon",      at:daysFromNow(-2)    },
  { id:"a6", kind:"task",    text:"Rachel completed task: April Meta Ads creative set",             at:daysFromNow(-2.4)  },
];
