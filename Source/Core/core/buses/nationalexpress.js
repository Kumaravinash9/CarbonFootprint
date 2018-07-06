var nationalexpressManager = function(footprintCore, settingsProvider) {
  this.footprintCore = footprintCore;
  this.settingsProvider = settingsProvider;
  this.dataSource = "uk";
  this.validator = new BusValidator("nationalexpress");
  this.subtree = true;
  this.footprintCore.storeBusEmissionData(this.dataSource);
  this.footprintCore.storeBusSpeedData(this.dataSource);
  debugger;
};

nationalexpressManager.prototype.setStyle = function(emission) {
  emission.querySelector("a").style.color = "black";
  return emission;
};

nationalexpressManager.prototype.insertInDom = function(emission, element) {
  emission = this.setStyle(emission);
  if (element.getElementsByClassName("carbon").length === 0) {
    element.appendChild(emission);
  }
};

nationalexpressManager.prototype.update = function() {
  debugger;
  if (
    document.querySelectorAll("div.ng-scope[ng-repeat='journey in data']")
      .length === 0
  )
    return;
  var self = this;
  document
    .querySelectorAll("div.ng-scope[ng-repeat='journey in data']")
    .forEach(function(row) {
      if (row.getElementsByClassName("carbon").length !== 0) return;
      var busDurationArray = self.validator
        .querySelector(".nx-duration.ng-binding", row)
        .textContent.trim()
        .split(" ");
      var busDuration =
        parseInt(busDurationArray[0], 10) +
        parseInt(busDurationArray[1], 10) / 60;
      debugger;
      self.insertInDom(
        self.footprintCore.getEmissionElementFromDuration(busDuration),
        row.querySelector(".nx-journey-details")
      );
    });
};

var WebsiteManager = nationalexpressManager;
