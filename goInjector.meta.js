// ==UserScript==
// @name         Gym Order Injector
// @namespace    https://github.com/jungheil/goInjector
// @license      Mulan PSL v2
// @copyright    2025 Jungheil
// @version      1.1.0
// @description  Inject order into Gym Booking System
// @icon         https://www.sysu.edu.cn/favicon.ico
// @author       Jungheil
// @homepage     https://github.com/jungheil/goInjector
// @match        *://gym.sysu.edu.cn/*
// @grant        none
// @run-at       document-start
// @downloadURL  https://raw.githubusercontent.com/jungheil/goInjector/main/goInjector.user.js
// @updateURL    https://raw.githubusercontent.com/jungheil/goInjector/main/goInjector.meta.js
// @supportURL   https://github.com/jungheil/goInjector
// ==/UserScript==

// Copyright (c) 2025 Jungheil
// Gym Order Injector is licensed under Mulan PSL v2.
// You can use this software according to the terms and conditions of the Mulan PSL v2.
// You may obtain a copy of Mulan PSL v2 at:
//          http://license.coscl.org.cn/MulanPSL2
// THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND,
// EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT,
// MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.
// See the Mulan PSL v2 for more details.

(function () {
  "use strict";

  function getVenueType() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://gym.sysu.edu.cn/api/venuetype/all", true);
    const access_token = JSON.parse(
      localStorage.getItem("scientia-session-authorization")
    ).access_token;
    xhr.setRequestHeader("Authorization", "Bearer " + access_token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        localStorage.setItem("venueType", xhr.responseText);
      }
    };
    xhr.send();
  }
  function getVenue(venueTypeId) {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "GET",
      "https://gym.sysu.edu.cn/api/venue/type/" + venueTypeId,
      false
    );
    const access_token = JSON.parse(
      localStorage.getItem("scientia-session-authorization")
    ).access_token;
    xhr.setRequestHeader("Authorization", "Bearer " + access_token);
    let result;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        result = JSON.parse(xhr.responseText);
      }
    };
    xhr.send();
    return result;
  }

  function getMe() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://gym.sysu.edu.cn/api/Credit/Me", true);
    const access_token = JSON.parse(
      localStorage.getItem("scientia-session-authorization")
    ).access_token;
    xhr.setRequestHeader("Authorization", "Bearer " + access_token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        localStorage.setItem("Me", xhr.responseText);
      }
    };
    xhr.send();
  }

  function getCreditFee(VenueTypeId) {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "GET",
      "https://gym.sysu.edu.cn/api/venuetype/" + VenueTypeId + "/feetemplates",
      false
    );
    const access_token = JSON.parse(
      localStorage.getItem("scientia-session-authorization")
    ).access_token;
    xhr.setRequestHeader("Authorization", "Bearer " + access_token);
    let result;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        result = JSON.parse(xhr.responseText).find(
          (item) => item.UserRole === "学生"
        ).CreditFee;
      }
    };
    xhr.send();
    return result;
  }

  function getRandomTime(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const randomDate = new Date(
      startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime())
    );
    return randomDate;
  }

  function generateBookingInfo() {
    const venueConfig = JSON.parse(localStorage.getItem("venueConfig"));
    const Me = JSON.parse(localStorage.getItem("Me"));

    if (venueConfig && venueConfig.VenueTypeId && venueConfig.VenueId) {
      const VenueTypeInfo = JSON.parse(localStorage.getItem("venueType")).find(
        (item) => item.Identity === venueConfig.VenueTypeId
      );
      const VenueInfo = getVenue(venueConfig.VenueTypeId).find(
        (item) => item.Identity === venueConfig.VenueId
      );
      const now = new Date();
      let startDateTime, endDateTime;

      if (venueConfig.timeSlot && venueConfig.bookingDate) {
        startDateTime = new Date(
          venueConfig.bookingDate + "T" + venueConfig.timeSlot.Start
        );
        endDateTime = new Date(
          venueConfig.bookingDate + "T" + venueConfig.timeSlot.End
        );
      } else {
        const timeSlots = VenueInfo.Schedules[0].TimeSlots;
        const currentTime = now.getHours() + now.getMinutes() / 60;

        const bookingTime = currentTime + 0.25;

        let targetSlot;
        for (let slot of timeSlots) {
          const slotStartTime =
            parseInt(slot.End.split(":")[0]) +
            parseInt(slot.End.split(":")[1]) / 60;
          if (slotStartTime >= bookingTime) {
            targetSlot = slot;
            break;
          }
        }

        if (!targetSlot) {
          targetSlot = timeSlots[0];
          now.setDate(now.getDate() + 1);
        }
        if (bookingTime < parseInt(timeSlots[0].Start.split(":")[0])) {
          targetSlot = timeSlots[0];
        }

        startDateTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(targetSlot.Start.split(":")[0]),
          parseInt(targetSlot.Start.split(":")[1])
        );
        endDateTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          parseInt(targetSlot.End.split(":")[0]),
          parseInt(targetSlot.End.split(":")[1])
        );
      }

      const CreateAt = getRandomTime(
        startDateTime.getTime() - 2 * 24 * 60 * 60 * 1000,
        startDateTime.getTime()
      );
      const UpdateAt = getRandomTime(CreateAt, endDateTime);

      if (
        venueConfig.isInitiator &&
        (venueConfig.participant.filter((p) => p.Name && p.HostKey).length >
          0 ||
          VenueTypeInfo.BookingType == "ResourcePool")
      ) {
        let BookingInfo = {
          Identity: venueConfig.Identity || crypto.randomUUID(),
          Name: venueConfig.Name || Me.Name,
          BookingId:
            venueConfig.BookingId ||
            "#RB-" +
              Array(10)
                .fill()
                .map(
                  () =>
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[
                      Math.floor(Math.random() * 36)
                    ]
                )
                .join(""),
          UserId: venueConfig.UserId || Me.UserId,
          VenueTypeId: venueConfig.VenueTypeId,
          VenueId: venueConfig.VenueId,
          VenueName: VenueInfo.Name,
          StartDateTime: startDateTime,
          EndDateTime: endDateTime,
          Participants: venueConfig.participant
            .filter((p) => p.Name && p.HostKey)
            .map((p) => ({
              UserId:
                p.UserId ||
                Array(Math.floor(4 + Math.random() * 4))
                  .fill()
                  .map(
                    () =>
                      "abcdefghijklmnopqrstuvwxyz"[
                        Math.floor(Math.random() * 26)
                      ]
                  )
                  .join("") + Math.floor(Math.random() * 999).toString(),
              Name: p.Name + " (" + p.HostKey + ")",
              HostKey: p.HostKey,
              Status: "Accepted",
            })),
          Status: "Accepted",
          Description: VenueTypeInfo.Name,
          CreatedAt: CreateAt,
          UpdatedAt: UpdateAt,
          ActionedBy:
            venueConfig.ActionedBy ||
            (venueConfig.participant &&
              venueConfig.participant[
                Math.floor(Math.random() * venueConfig.participant.length)
              ]?.UserId) ||
            venueConfig.UserId ||
            Me.UserId,
          Charge: getCreditFee(venueConfig.VenueTypeId),
          IsCash: false,
        };
        localStorage.setItem("BookingInfo", JSON.stringify(BookingInfo));
      } else if (!venueConfig.isInitiator && venueConfig.Name) {
        let BookingInfo = {
          Identity: venueConfig.Identity || crypto.randomUUID(),
          Name: venueConfig.Name,
          BookingId:
            venueConfig.BookingId ||
            "#RB-" +
              Array(10)
                .fill()
                .map(
                  () =>
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[
                      Math.floor(Math.random() * 36)
                    ]
                )
                .join(""),
          UserId:
            venueConfig.UserId ||
            Array(Math.floor(4 + Math.random() * 4))
              .fill()
              .map(
                () =>
                  "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
              )
              .join("") + Math.floor(Math.random() * 999).toString(),
          VenueTypeId: venueConfig.VenueTypeId,
          VenueId: venueConfig.VenueId,
          VenueName: VenueInfo.Name,
          StartDateTime: startDateTime,
          EndDateTime: endDateTime,
          Participants:
            venueConfig.participant.filter((p) => p.Name && p.HostKey)
              .length === 0
              ? [
                  {
                    UserId: Me.UserId,
                    Name: Me.Name + " (" + Me.HostKey + ")",
                    HostKey: Me.HostKey,
                    Status: "Accepted",
                  },
                ]
              : venueConfig.participant
                  .filter((p) => p.Name && p.HostKey)
                  .map((p) => ({
                    UserId:
                      p.UserId ||
                      Array(Math.floor(4 + Math.random() * 4))
                        .fill()
                        .map(
                          () =>
                            "abcdefghijklmnopqrstuvwxyz"[
                              Math.floor(Math.random() * 26)
                            ]
                        )
                        .join("") + Math.floor(Math.random() * 999).toString(),
                    Name: p.Name + " (" + p.HostKey + ")",
                    HostKey: p.HostKey,
                    Status: "Accepted",
                  })),
          Status: "Accepted",
          Description: VenueTypeInfo.Name,
          CreatedAt: CreateAt,
          UpdatedAt: UpdateAt,
          ActionedBy:
            venueConfig.ActionedBy ||
            (venueConfig.participant &&
              venueConfig.participant[
                Math.floor(Math.random() * venueConfig.participant.length)
              ]?.UserId) ||
            Me.UserId ||
            venueConfig.UserId,
          Charge: getCreditFee(venueConfig.VenueTypeId),
          IsCash: false,
        };
        localStorage.setItem("BookingInfo", JSON.stringify(BookingInfo));
      } else {
        localStorage.setItem("BookingInfo", "");
      }
    } else {
      localStorage.setItem("BookingInfo", "");
    }
  }

  getVenueType();
  getMe();
  generateBookingInfo();

  const xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
    let venueConfig = JSON.parse(localStorage.getItem("venueConfig"));

    const xhr = this;
    let url = new URL(arguments[1]);
    if (
      (url.pathname == "/api/BookingRequestVenue" &&
        venueConfig?.isInitiator) ||
      (url.pathname == "/api/BookingRequestVenue/Participants" &&
        !venueConfig?.isInitiator)
    ) {
      const getter = Object.getOwnPropertyDescriptor(
        XMLHttpRequest.prototype,
        "responseText"
      ).get;
      Object.defineProperty(xhr, "responseText", {
        get: () => {
          let result = getter.call(xhr);
          const bookingInfo = localStorage.getItem("BookingInfo");
          if (bookingInfo) {
            let ret = JSON.parse(result);
            ret.push(JSON.parse(bookingInfo));
            return JSON.stringify(ret);
          }
          return result;
        },
      });
    }
    return xhrOpen.apply(xhr, arguments);
  };

  const style = document.createElement("style");
  style.textContent = `
    .config-button {
      position: fixed;
      left: 20px;
      top: 20px;
      z-index: 9999;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0);
      color: rgba(255, 255, 255, 0.02);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.3s;
    }
    
    .config-button:hover {
      opacity: 0.8;
    }

    .config-dialog {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 10000;
      max-height: 80vh;
      overflow-y: auto;
      min-width: 400px;
      width: 90%;
      max-width: 600px;
    }
    .config-dialog::-webkit-scrollbar {
      width: 8px;
    }
    .config-dialog::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    .config-dialog::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }
    .config-dialog::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
    .config-dialog input {
      display: block;
      margin: 10px 0;
      padding: 5px;
      width: 300px;
    }

    .input-group {
      margin-bottom: 12px;
    }

    .input-label {
      display: block;
      font-size: 12px;
      color: #063;
      margin-bottom: 2px;
    }

    .config-dialog select,
    .config-dialog input {
      width: 100%;
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }

    .button-group {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .save-btn {
      padding: 8px 20px;
      background: #063;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .cancel-btn {
      padding: 8px 20px;
      background: #f5f5f5;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
    }

    h3 {
      color: #063;
      margin-bottom: 16px;
    }

    .participants-section {
      margin-top: 12px;
    }

    .participant-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .participant-item input {
      flex: 1;
      min-width: 0;
    }

    .remove-participant {
      background: none;
      border: none;
      color: #ff4444;
      font-size: 18px;
      cursor: pointer;
      padding: 5px;
      line-height: 1;
      transition: color 0.2s;
    }

    .remove-participant:hover {
      color: #ff0000;
    }

    .add-participant {
      background: #063;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      padding: 8px 16px;
      margin-bottom: 16px;
      transition: all 0.3s ease;
    }

    .add-participant:disabled {
      background: #cccccc;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .collapsible {
      margin-top: 12px;
    }

    .collapse-header {
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      color: #063;
      font-size: 14px;
      margin-bottom: 12px;
    }

    .collapse-header:hover {
      opacity: 0.8;
    }

    .collapse-icon {
      width: 16px;
      height: 16px;
      margin-right: 8px;
      transition: transform 0.3s;
      color: #063;
    }

    .collapse-icon.expanded {
      transform: rotate(90deg);
    }

    .collapse-content {
      display: none;
    }

    .collapse-content.expanded {
      display: block;
    }
  `;
  document.head.appendChild(style);

  const venueType = JSON.parse(localStorage.getItem("venueType"));
  let participants = [];

  const dialog = document.createElement("div");
  dialog.className = "config-dialog";
  dialog.innerHTML = `
      <h3>注入配置</h3>
      
      <div class="input-group">
        <label class="input-label">场馆类型</label>
        <select id="config-VenueTypeId">
          <option value="">请选择场馆</option>
          ${venueType
            .map(
              (venue) =>
                `<option value="${venue.Identity}">${venue.Name}</option>`
            )
            .join("")}
        </select>
      </div>

      <div class="input-group">
        <label class="input-label">场地</label>
        <select id="config-VenueId" disabled>
          <option value="">请先选择场馆</option>
        </select>
      </div>

      <div class="input-group">
        <label class="input-label">时间</label>
        <select id="config-autoDate">
          <option value="1">自动</option>
          <option value="0">自定义</option>
        </select>
      </div>

      <div id="manualDateGroup" style="display:none">
        <div class="input-group">
          <label class="input-label">时间段</label>
          <select id="config-timeSlot" disabled>
            <option value="">请先选择场地</option>
          </select>
        </div>

        <div class="input-group">
          <label class="input-label">日期</label>
          <div class="date-picker">
            <input type="date" id="config-bookingDate" value="${
              new Date().toISOString().split("T")[0]
            }">
          </div>
        </div>
      </div>

      <div class="participants-section is-initiator-fields">
        <label class="input-label">同伴信息</label>
        <div id="participantsList">
          <!-- 同伴列表将在这里动态生成 -->
        </div>
        <button class="add-participant" id="addParticipant">添加</button>
      </div>

      <div class="input-group not-initiator-fields" style="display: none;">
        <label class="input-label">发起人</label>
        <input type="text" id="config-Name-disabled">
      </div>

      <div class="collapsible">
        <div class="collapse-header" id="optionalFieldsToggle">
          <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          非必填选项
        </div>

        <div class="collapse-content" id="optionalFields">

          <div class="participants-section not-initiator-fields" style="display: none;">
            <label class="input-label">同伴信息</label>
            <div id="participantsList-disabled">
              <!-- 同伴列表将在这里动态生成 -->
            </div>
            <button class="add-participant" id="addParticipant">添加</button>
          </div>

          <div class="input-group is-initiator-fields">
            <label class="input-label">发起人</label>
            <input type="text" id="config-Name">
          </div>

          <div class="input-group">
            <label class="input-label">发起人NetID</label>
            <input type="text" id="config-UserId">
          </div>

          <div class="input-group">
            <label class="input-label">订单UUID</label>
            <input type="text" id="config-Identity">
          </div>

          <div class="input-group">
            <label class="input-label">订单号</label>
            <input type="text" id="config-bookingId">
          </div>

          <div class="input-group">
            <label class="input-label">订单创建时间</label>
            <input type="datetime-local" id="config-createdAt">
          </div>

          <div class="input-group">
            <label class="input-label">订单更新时间</label>
            <input type="datetime-local" id="config-updatedAt">
          </div>

          <div class="input-group">
            <label class="input-label">操作NetID</label>
            <input type="text" id="config-ActionedBy">
          </div>
        </div>
      </div>
      
      <div class="input-group">
        <label class="input-label" style="display: flex; align-items: center;">
          <input type="checkbox" id="config-isInitiator" checked style="width: auto; margin-right: 8px;">
          我是发起人
        </label>
      </div>

      <div class="button-group">
        <button id="cancelConfig" class="cancel-btn">取消</button>
        <button id="saveConfig" class="save-btn">保存</button>
      </div>
    `;
  document.body.appendChild(dialog);

  function showDialog() {
    dialog.style.display = "block";

    document
      .getElementById("config-autoDate")
      .addEventListener("change", function (e) {
        const manualDateGroup = document.getElementById("manualDateGroup");
        manualDateGroup.style.display =
          e.target.value === "0" ? "block" : "none";
      });

    const savedConfig = JSON.parse(localStorage.getItem("venueConfig")) || {
      isInitiator: true,
      VenueTypeId: "",
      VenueId: "",
      timeSlot: "",
      bookingDate: "",
      participant: [],
      Name: "",
      UserId: "",
      Identity: "",
      bookingId: "",
      createdAt: "",
      updatedAt: "",
      ActionedBy: "",
    };

    document.getElementById("config-isInitiator").checked =
      savedConfig.isInitiator;
    if (!savedConfig.isInitiator) {
      document
        .getElementById("config-isInitiator")
        .dispatchEvent(new Event("change"));
    }

    setTimeout(() => {
      document.getElementById("config-VenueTypeId").value =
        savedConfig.VenueTypeId;
      document
        .getElementById("config-VenueTypeId")
        .dispatchEvent(new Event("change"));
      setTimeout(() => {
        document.getElementById("config-Name").value = savedConfig.Name;
        document.getElementById("config-UserId").value = savedConfig.UserId;
        if (savedConfig.participant) {
          participants = savedConfig.participant;
          renderparticipants();
        }
      }, 100);
    }, 100);

    setTimeout(() => {
      document.getElementById("config-VenueId").value = savedConfig.VenueId;
      document
        .getElementById("config-VenueId")
        .dispatchEvent(new Event("change"));
      setTimeout(() => {
        document.getElementById("config-timeSlot").value = savedConfig.timeSlot;
      }, 100);
    }, 100);
    document.getElementById("config-bookingDate").value =
      savedConfig.bookingDate;
    document.getElementById("config-Identity").value = savedConfig.Identity;
    document.getElementById("config-bookingId").value = savedConfig.bookingId;
    document.getElementById("config-createdAt").value = savedConfig.createdAt;
    document.getElementById("config-updatedAt").value = savedConfig.updatedAt;
    document.getElementById("config-ActionedBy").value = savedConfig.ActionedBy;

    if (savedConfig.bookingDate && savedConfig.timeSlot) {
      document.getElementById("config-autoDate").value = 0;
      document
        .getElementById("config-autoDate")
        .dispatchEvent(new Event("change"));
    }
  }

  const floatButton = document.createElement("button");
  floatButton.className = "config-button";
  floatButton.textContent = "Inject!";
  let pressTimer;
  let isLongPress = false;

  floatButton.addEventListener("mousedown", () => {
    pressTimer = setTimeout(() => {
      isLongPress = true;
    }, 800);
  });

  floatButton.addEventListener("mouseup", () => {
    clearTimeout(pressTimer);
    if (isLongPress) {
      showDialog();
    }
    isLongPress = false;
  });

  floatButton.addEventListener("mouseleave", () => {
    clearTimeout(pressTimer);
    isLongPress = false;
  });

  floatButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pressTimer = setTimeout(() => {
      isLongPress = true;
    }, 800);
  });

  floatButton.addEventListener("touchend", (e) => {
    e.preventDefault();
    clearTimeout(pressTimer);
    if (isLongPress) {
      showDialog();
    }
    isLongPress = false;
  });

  floatButton.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    clearTimeout(pressTimer);
    isLongPress = false;
  });
  document.body.appendChild(floatButton);

  document.getElementById("saveConfig").addEventListener("click", () => {
    const savedConfig = {
      isInitiator: document.getElementById("config-isInitiator").checked,
      VenueTypeId: document.getElementById("config-VenueTypeId").value,
      VenueId: document.getElementById("config-VenueId").value,
      timeSlot: document.getElementById("config-timeSlot").value,
      bookingDate: document.getElementById("config-bookingDate").value,
      participant: participants,
      Name: document.getElementById("config-Name").value,
      UserId: document.getElementById("config-UserId").value,
      Identity: document.getElementById("config-Identity").value,
      bookingId: document.getElementById("config-bookingId").value,
      createdAt: document.getElementById("config-createdAt").value,
      updatedAt: document.getElementById("config-updatedAt").value,
      ActionedBy: document.getElementById("config-ActionedBy").value,
    };
    if (document.getElementById("config-autoDate").value) {
      savedConfig.bookingDate = "";
      savedConfig.timeSlot = "";
    }
    localStorage.setItem("venueConfig", JSON.stringify(savedConfig));
    generateBookingInfo();
    dialog.style.display = "none";
    window.location.reload();
  });

  document.getElementById("cancelConfig").addEventListener("click", () => {
    dialog.style.display = "none";
  });

  document
    .getElementById("config-isInitiator")
    .addEventListener("change", function (e) {
      if (e.target.checked) {
        const isInitiatorFields = document.getElementsByClassName(
          "is-initiator-fields"
        );
        for (let field of isInitiatorFields) {
          field.style.display = "block";
          field.querySelectorAll("input").forEach((input) => {
            input.id = input.id.replace("-disabled", "");
          });
          field.querySelectorAll("div").forEach((button) => {
            button.id = button.id.replace("-disabled", "");
          });
        }

        const notInitiatorFields = document.getElementsByClassName(
          "not-initiator-fields"
        );
        for (let field of notInitiatorFields) {
          field.style.display = "none";
          field.querySelectorAll("input").forEach((input) => {
            input.id = input.id + "-disabled";
          });
          field.querySelectorAll("div").forEach((button) => {
            button.id = button.id + "-disabled";
          });
        }
      } else {
        const isInitiatorFields = document.getElementsByClassName(
          "is-initiator-fields"
        );
        for (let field of isInitiatorFields) {
          field.style.display = "none";
          field.querySelectorAll("input").forEach((input) => {
            input.id = input.id + "-disabled";
          });
          field.querySelectorAll("div").forEach((button) => {
            button.id = button.id + "-disabled";
          });
        }

        const notInitiatorFields = document.getElementsByClassName(
          "not-initiator-fields"
        );
        for (let field of notInitiatorFields) {
          field.style.display = "block";
          field.querySelectorAll("input").forEach((input) => {
            input.id = input.id.replace("-disabled", "");
          });
          field.querySelectorAll("div").forEach((button) => {
            button.id = button.id.replace("-disabled", "");
          });
        }
      }
    });

  document
    .getElementById("config-VenueTypeId")
    .addEventListener("change", function (e) {
      const venueSelect = document.getElementById("config-VenueId");
      const timeSlotSelect = document.getElementById("config-timeSlot");

      if (!e.target.value) {
        venueSelect.disabled = true;
        venueSelect.innerHTML = '<option value="">请先选择场馆</option>';
        timeSlotSelect.disabled = true;
        timeSlotSelect.innerHTML = '<option value="">请先选择场地</option>';
        return;
      }
      const venueInfo = getVenue(e.target.value);
      venueSelect.innerHTML = `
        <option value="">请选择场地</option>
        ${venueInfo
          .map(
            (venue) => `
          <option value="${venue.Identity}"
            data-schedules='${JSON.stringify(venue.Schedules)}'
          >${venue.Name}</option>
        `
          )
          .join("")}
      `;
      venueSelect.disabled = false;

      if (
        venueType.find((venueType) => venueType.Identity === e.target.value)
          .BookingType == "ResourcePool"
      ) {
        document.getElementById("addParticipant").disabled = true;
        document.getElementById("config-isInitiator").disabled = true;
        document.getElementById("config-isInitiator").checked = true;
        document
          .getElementById("config-isInitiator")
          .dispatchEvent(new Event("change"));

        participants = [];
        renderparticipants();
      } else {
        document.getElementById("addParticipant").disabled = false;
        document.getElementById("config-isInitiator").disabled = false;
      }
    });

  document
    .getElementById("config-VenueId")
    .addEventListener("change", function (e) {
      const timeSlotSelect = document.getElementById("config-timeSlot");

      if (!e.target.value) {
        timeSlotSelect.disabled = true;
        timeSlotSelect.innerHTML = '<option value="">请先选择场地</option>';
        return;
      }

      const selectedOption = e.target.selectedOptions[0];
      const schedules = JSON.parse(selectedOption.dataset.schedules);

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const validSchedule = schedules.find(
        (schedule) =>
          schedule.StartDate <= todayStr && schedule.EndDate >= todayStr
      );
      if (validSchedule) {
        timeSlotSelect.innerHTML = `
          <option value="">请选择时间段</option>
          ${validSchedule.TimeSlots.map((slot) => {
            const startTime = new Date(`${todayStr}T${slot.Start}:00`);
            const endTime = new Date(`${todayStr}T${slot.End}:00`);
            return `
              <option value='${JSON.stringify({
                startTime: startTime,
                endTime: endTime,
              })}'>
                ${slot.Start} - ${slot.End}
              </option>
            `;
          }).join("")}
        `;
        timeSlotSelect.disabled = false;
      }
    });

  function createParticipantItem(participant, index) {
    const div = document.createElement("div");
    div.className = "participant-item";
    div.innerHTML = `
        <input type="text" placeholder="姓名" value="${participant.Name}"
               onchange="updateParticipant(${index}, 'Name', this.value)">
        <input type="text" placeholder="学号" value="${participant.HostKey}"
               onchange="updateParticipant(${index}, 'HostKey', this.value)">
        <input type="text" placeholder="NetID*" value="${participant.UserId}"
               onchange="updateParticipant(${index}, 'UserId', this.value)">
        <button class="remove-participant" onclick="removeParticipant(${index})" title="删除">×</button>
      `;
    return div;
  }

  function renderparticipants() {
    const container = document.getElementById("participantsList");
    container.innerHTML = "";
    participants.forEach((participant, index) => {
      container.appendChild(createParticipantItem(participant, index));
    });
  }

  window.updateParticipant = function (index, field, value) {
    participants[index][field] = value;
  };

  window.removeParticipant = function (index) {
    participants.splice(index, 1);
    renderparticipants();
  };

  document.getElementById("addParticipant").addEventListener("click", () => {
    participants.push({ Name: "", HostKey: "", UserId: "" });
    renderparticipants();
  });

  document
    .getElementById("optionalFieldsToggle")
    .addEventListener("click", function () {
      const content = document.getElementById("optionalFields");
      const icon = this.querySelector(".collapse-icon");

      content.classList.toggle("expanded");
      icon.classList.toggle("expanded");
    });
})();
