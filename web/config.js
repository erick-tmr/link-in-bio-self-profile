// EDIT SETTINGS HERE:

/*
* Set to true to hide credit text, set to false to display credit text.
* The credit is a short link to the Github repo of this project.
*/
const disableCredit = false;

/*
* Choose to show an email link button at the end of the link list.
* Set the email address to use in the emailAddress variable below.
*/
const showEmailLink = true;
const emailAddress = "erick.tmr@outlook.com";

/*
* To tell gravatar where to look for your data you must provide a MD5 hash of your
* primary email address. To hash your email you can use something like:
* https://www.md5hashgenerator.com/ (not verified for security)
*/
const emailMd5Hash = MD5.generate(emailAddress);

/*
* Create Custom Links
* Add links to customLinks following the example format.
* Links added here will display above the email button but below links brought in from Gravatar.
* 
* The domain field is used for getting a favicon icon if useEmojiIcon is set to false.
* If useEmojiIcon is true, the list item icon will be whatever emoji (or other text) is in the emojiIcon field.
*/
const customLinks = {
  "links": [
    {
      "label": "ericktmr",
      "url": "https://www.linkedin.com/in/ericktmr/",
      "domain": "https://www.linkedin.com",
      "useEmojiIcon": false
    },
    {
      "label": "Blog",
      "url": "https://dev.to/erick_tmr",
      "domain": "",
      "useEmojiIcon": true,
      "emojiIcon": "📝"
    },
    {
      "label": "Mentoria Tech",
      "url": "https://calendly.com/ericktmr/mentoria",
      "domain": "",
      "useEmojiIcon": true,
      "emojiIcon": "📆"
    },
    {
      "label": "Pergunte me qualquer coisa",
      "url": "https://curiouscat.live/ErickTakeshi",
      "domain": "",
      "useEmojiIcon": true,
      "emojiIcon": "🐈❓"
    },
  ]
}

export default {
  customLinks: customLinks,
  emailMd5Hash: emailMd5Hash,
  emailAddress: emailAddress,
  showEmailLink: showEmailLink,
  disableCredit: disableCredit
}
