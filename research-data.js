// Research building content. Edit this file to change what each board shows — no code changes needed.
// Every section uses the same layout (research-board.js). Per section you can change:
//   title, subtitle, icon, accent (colour), blocks (which blocks show, in what order, and their headings),
//   and the content lists: trends, selling, ideas, sources.
// "inShop" notes link a trend to a set already in the Honey Meadows Nails Co. catalog.
window.HONEY_MEADOWS_RESEARCH={
 researched:'2026-10-30',
 defaults:{
  accent:'#b4561e',
  blocks:[
   {type:'trends',heading:'Trending now'},
   {type:'selling',heading:'What’s selling'},
   {type:'ideas',heading:'Ideas to try'},
   {type:'sources',heading:'Sources'}
  ]
 },
 sections:{
  tiktok:{
   title:'TikTok',icon:'🎵',subtitle:'What nail videos are blowing up right now',
   trends:[
    {name:'Velvet cat-eye',what:'Magnetic gel with a soft, moving band of light, now in deep jewel tones and diffused “velvet” finishes.',inShop:'Cocoa Stardust, Smoky Moonstone',source:0},
    {name:'Glazed-donut & pearl chrome',what:'Pearlescent chrome over a milky sheer base for a soft glow.',inShop:'Golden Hour Pearl, Golden Hour Pearls',source:0},
    {name:'Aura nails',what:'A soft centre of colour fading out to the edges of each nail.',inShop:'Winterberry Aura',source:0},
    {name:'Coquette bows',what:'Soft pink or French bases with tiny hand-painted bows.',inShop:'Cottagecore Sage Bows',source:0},
    {name:'Silver mirror chrome',what:'Liquid-metal silver for a reflective, mirror finish.',inShop:'Silver Heirloom',source:0},
    {name:'Mismatched sets',what:'Ten different designs tied together by one colour palette.',inShop:'',source:0},
    {name:'Dark chocolate & black cherry',what:'Gourmand browns and near-black reds are this October’s dark shades.',inShop:'Dark Chocolate Espresso, Cherry Cola Crush',source:1},
    {name:'Animal print',what:'Leopard, tortoiseshell and deer-spot “Bambi” prints, sometimes layered over cat-eye.',inShop:'Golden Honey Tortoiseshell, Fawn in the Meadow',source:1}
   ],
   selling:[
    'Short 5–10 second application demos showing the finished look sell press-ons on TikTok Shop.',
    'Listings name the shape and finish up front, and include a sizing chart (XS–XL).',
    'Bundles that state the adhesive (tabs, glue, or both) cut down on returns.',
    'Multi-shape packs and a few “hero” sets (3 shapes × 2 colourways + 1 seasonal) are the suggested starting lineup.'
   ],
   ideas:[
    'Film a 10-second clip of Cocoa Stardust catching the light — cat-eye movement is the hook.',
    'Do a “which fall set are you?” video with Winterberry Aura, Fawn in the Meadow and Golden Honey Tortoiseshell.',
    'Show a press-on application start to finish in under 15 seconds.',
    'Post packing-an-order videos — casual and unpolished is fine.'
   ],
   sources:[
    {title:'TikTok Nails: 12 Viral Trends (Polishora, updated Oct 26, 2026)',url:'https://polishora.com/viral-tiktok-nails-2026/'},
    {title:'October Nail Trends (Who What Wear, Oct 24, 2026)',url:'https://www.whowhatwear.com/beauty/nails/october-nail-colors-designs-ideas-2026'},
    {title:'TikTok Shop Press-On Nail Selling Guide (365 Nails)',url:'https://365nails.com/blogs/dropshipping/tiktok-shop-press-on-nail-selling-guide-2026-05-29'},
    {title:'Trending Nails Designs 2026 (TikTok)',url:'https://www.tiktok.com/discover/trending-nails-designs-2026'}
   ]
  },
  pinterest:{
   title:'Pinterest',icon:'📌',subtitle:'What people are searching and saving',
   trends:[
    {name:'Plum noir',what:'Deep purple, burnt burgundy and brown. Searches for dark plum / deep burgundy nails up 220%+.',inShop:'Winterberry Aura, Cherry Cola Crush',source:0},
    {name:'Cool blue chrome',what:'Icy blue chrome nails — searches up 235%+.',inShop:'Frosted Bluebell',source:0},
    {name:'Jade marble',what:'Muted, earthy green; jade marble nails saw a 450% spike in interest.',inShop:'Sage Advice (close match)',source:0},
    {name:'Wasabi green',what:'Chartreuse-leaning green — searches up 175%+.',inShop:'',source:0},
    {name:'Brown fall nails',what:'“Brown fall nails” searches up 800% month over month heading into fall.',inShop:'Dark Chocolate Espresso, Cocoa Stardust',source:1},
    {name:'Simple & short fall nails',what:'“Simple fall nails”, “fall nails short”, fall almond and fall square all climbing.',inShop:'Blush Petal, Classic Blush French Tips',source:1},
    {name:'Heritage patterns',what:'Plaid, argyle, tweed and knit textures with a looser, modern feel.',inShop:'',source:2},
    {name:'Funky French',what:'French tips updated with tortoiseshell, stripes, polka dots and texture.',inShop:'Cottagecore Sage Bows',source:2}
   ],
   selling:[
    'Pinterest works like a search engine — descriptive pin titles get found.',
    'Seasonal searches start early: fall searches jumped weeks before the season; holiday searches follow the same pattern.',
    'Shape + season phrases (“fall almond nails”, “fall nails short”) are rising search terms.'
   ],
   ideas:[
    'Pin every listing with a plain, searchable title, e.g. “Brown cat eye press on nails — almond”.',
    'Make boards: Fall Nails 2026, Brown Fall Nails, Holiday Nails, Bridal Nails.',
    'Start holiday and winter pins now so they’re indexed before December.',
    'Pin close-ups and on-hand photos, not just flat lays.'
   ],
   sources:[
    {title:'Top 5 Nail Colors for 2026, According to Pinterest (NewBeauty)',url:'https://www.newbeauty.com/view/pinterest-2026-nail-color-trends'},
    {title:'Pinterest Nail Trends Report: August 2026 (Mirelle)',url:'https://mirelleinspo.com/pinterest/pinterest-nail-trends-report-august-2026'},
    {title:'Trending nail styles for autumn/winter 2026 (Scratch, Sept 28, 2026)',url:'https://www.scratchmagazine.co.uk/nailart-technique/aw26-nail-trends/'},
    {title:'Pinterest Predicts 2026 (Scratch)',url:'https://www.scratchmagazine.co.uk/feature/nail-art/pinterest-predicts-2026/'}
   ]
  },
  marketing:{
   title:'Marketing',icon:'📣',subtitle:'What’s selling on Etsy and how to get seen',
   trends:[
    {name:'Gothic glam & burgundy',what:'Dark burgundy, gold chrome and leopard sets show up among Etsy’s top-selling press-ons.',inShop:'Cherry Cola Crush, Winterberry Aura',source:0},
    {name:'Florals & nature',what:'3D floral, dragonfly and woodland designs are common among top sellers.',inShop:'Fawn in the Meadow',source:0},
    {name:'Cat-eye & galaxy',what:'Sparkly cat-eye effects are among the best-selling looks.',inShop:'Cocoa Stardust, Smoky Moonstone',source:0},
    {name:'Coquette & romantic',what:'Bows and butterflies appear in many top-selling titles.',inShop:'Cottagecore Sage Bows',source:0}
   ],
   selling:[
    'Top Etsy press-on listings are mid-priced, trend-driven sets — roughly $8–$23 per sale on average, up to about $37.',
    'Sizing kits and custom orders sell as low-cost add-ons alongside sets.',
    'Use all 13 Etsy tags with specific phrases, put the main keyword at the start of the title, and renew listings now and then.',
    'Collect emails early (small discount or early access) and time emails around launches and holidays.'
   ],
   ideas:[
    'Holiday dates: Thanksgiving Nov 26, Black Friday Nov 27, Cyber Monday Nov 30, 2026 — plan a sale and gift sets.',
    'Add a sizing kit listing as a cheap first purchase.',
    'Make a “gift-ready” holiday set with a note card.',
    'Re-check titles: lead with the trend name (“Brown Cat Eye Press On Nails…”).'
   ],
   sources:[
    {title:'Top 100 best-selling press-on nails on Etsy 2026 (EtsyHunt)',url:'https://ehunt.ai/etsy-competitor-research/best-etsy-press-on-nails'},
    {title:'How to Promote Your Handmade Items Online in 2026 (Craftybase)',url:'https://craftybase.com/blog/how-to-promote-your-handmade-items-online'},
    {title:'How to Sell Your Press-on Nails on Etsy (Nails Magazine)',url:'https://www.nailsmag.com/articles/how-to-sell-your-press-on-nails-on-etsy'},
    {title:'Best Selling Press on Nails (Etsy)',url:'https://www.etsy.com/market/best_selling_press_on_nails'}
   ]
  }
 }
};
