import config from "./config.js";

// Get information from gravatar:
fetch('https://gravatar.com/' + config.emailMd5Hash + '.json')
  .then(response => response.json())
  .then(response => {
    const userProfile = response["entry"][0];
    // Uncomment below to see what all data you can use:
    console.log(userProfile)

    // Update various elements:
    document.getElementById("loading").style = "display: none;"
    document.querySelector("link[rel='shortcut icon']").href = userProfile["thumbnailUrl"] + ".ico";
    document.querySelector("link[rel*='icon']").href = userProfile["thumbnailUrl"] + ".ico";
    document.querySelector("title").innerHTML = userProfile["displayName"] + " | Link Page";
    document.getElementById("ogTitle").content = userProfile["displayName"] + " | Link Page";
    document.getElementById("ogSiteName").content = window.location.hostname;
    document.getElementById("ogDesc").content = userProfile["displayName"] + "'s social and web links."
    document.getElementById("themeColor").content = userProfile.profileBackground?.color;
    document.getElementById("profileImage").src = userProfile["thumbnailUrl"]
    document.getElementById("profileImage").alt = userProfile["displayName"] + "\'s Profile Picture"
    document.getElementById("formattedName").innerHTML = userProfile.displayName;
    document.getElementById("location").innerHTML = userProfile["currentLocation"]
    document.getElementById("aboutBio").innerHTML = userProfile["aboutMe"]
    document.getElementsByTagName("body")[0].style = "background-image: url('" + userProfile.profileBackground?.url + "'); background-color: " + userProfile.profileBackground?.color + "; background-size: fill; background-position: center; background-repeat: no-repeat;"

    // Render socials and URLs:
    var socialsFill = "";
    for (var i = 0; i < userProfile["accounts"]?.length; i++) {
      socialsFill = socialsFill + "<a rel='noopener' href='" + userProfile["accounts"][i]["url"] + "' target='_blank'><li><img src='" + userProfile["accounts"][i]["iconUrl"] + "' alt='" + userProfile["accounts"][i]["shortname"] + " Icon'" + "><p>" + userProfile["accounts"][i]["display"] + "</p></li></a>"
    }
    for (var i = 0; i < userProfile["urls"]?.length; i++) {
      socialsFill = socialsFill + "<a rel='noopener' href='" + userProfile["urls"][i]["value"] + "' target='_blank'><li><img src='" + userProfile["urls"][i]["value"] + "/favicon.ico' alt='" + userProfile["urls"][i]["title"] + " Icon'" + "><p>" + userProfile["urls"][i]["title"] + "</p></li></a>"
    }
    for (var i = 0; i < config.customLinks["links"].length; i++) {
      socialsFill = socialsFill + "<a rel='noopener' href='" + config.customLinks["links"][i]["url"] + "' target='_blank'><li>"
      if (config.customLinks["links"][i]["useEmojiIcon"] == true) {
        socialsFill = socialsFill + "<p id='emojiIcon'>" + config.customLinks["links"][i]["emojiIcon"] + "</p>";
      } else if (config.customLinks["links"][i]["useEmojiIcon"] == false) {
        socialsFill = socialsFill + "<img src='" + config.customLinks["links"][i]["domain"] + "/favicon.ico' alt='" + config.customLinks["links"][i]["label"] + " Icon'>"
      }
      socialsFill = socialsFill + "<p>" + config.customLinks["links"][i]["label"] + "</p></li></a>"
    }
    if (config.showEmailLink) {
      socialsFill = socialsFill + "<a rel='noopener' href='mailto:" + config.emailAddress + "' target='_blank '><li><p>✉ Entre em contato</p></li>"
    }
    document.getElementById("socials").innerHTML = "<ul>" + socialsFill + "</ul>";
    document.getElementById("credit").style = "display: inherit;"
  }).catch((error) => {
    // Only network error comes here
    document.getElementById("loading").innerHTML = "Error: Unable to get Gravatar data."
    document.getElementById("credit").style = "display: none;"
  });

// Disable credit text based on settings
if (config.disableCredit) {
  document.getElementById("credit").style = "display: none;"
} else {
  document.getElementById("credit").innerHTML = "<a rel='noopener' href='https://github.com/mackenly/quickbiolinks' target='_blank'>Built with QuickBioLinks</a>"
}
