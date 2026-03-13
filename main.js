const fs = require("fs");

function timeToSeconds(timeStr) {
    timeStr = timeStr.toLowerCase().trim();
    if (timeStr.includes("am") || timeStr.includes("pm")) {
        let parts = timeStr.split(" ");
        let timePart = parts[0];
        let period = parts[1];
        let [h, m, s] = timePart.split(":").map(Number);
        if (period === "pm" && h < 12) h += 12;
        if (period === "am" && h === 12) h = 0;
        return h * 3600 + m * 60 + s;
    } else {
        let [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }
}

function secondsToHMS(sec) {
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    let s = sec % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================

// Calculate shift duration
function getShiftDuration(startTime, endTime) {
    // This function calculates how long the shift lasted
    // from startTime to endTime
     // TODO: Implement this function
    let startSec = timeToSeconds(startTime);//to conver start to end
    let endSec = timeToSeconds(endTime);//to convert end to start
    let diff = endSec - startSec;

    // overnight shift
    //if negative then shift passed midnight (overnight shift)
    //so we add 24 hours
    if (diff < 0) diff += 24 * 3600;

    return secondsToHMS(diff);
}


// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
// Calculate idle time outside delivery hours (8–22)
function getIdleTime(startTime, endTime) {
     // TODO: Implement this function
    let start = timeToSeconds(startTime);
    let end = timeToSeconds(endTime);

    if (end < start) end += 24 * 3600; // overnight
    let deliveryStart = 8 * 3600;
    let deliveryEnd = 22 * 3600;
    let idle = 0;
 // before 8am
    if (start < deliveryStart)
        idle += deliveryStart - start;
// after 10pm
    if (end > deliveryEnd)
        idle += end - deliveryEnd;
    return secondsToHMS(idle);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    // TODO: Implement this function
    let shift = timeToSeconds(shiftDuration);
    let idle = timeToSeconds(idleTime);
    // active time = shift - idle
    let active = shift - idle;

    // make sure active is not negative
    if (active < 0) {
        active = 0;
    }
    return secondsToHMS(shift - idle);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // TODO: Implement this function
    let activeSec = timeToSeconds(activeTime);
    //split date to year, month, day
    let [y, m, d] = date.split("-").map(Number);
    //check if date is in Eid period
    let isEid = (y === 2025 && m === 4 && d >= 10 && d <= 30);
    //set quota depending on Eid or normal day
    let quotaSec = isEid
        ? 6 * 3600
        : 8 * 3600 + 24 * 60;
    return activeSec >= quotaSec;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
// ============================================================
// 5 addShiftRecord

function addShiftRecord(textFile, shiftObj) {

    //Read file safely (in case file does not exist)
    let content = fs.existsSync(textFile)
        ? fs.readFileSync(textFile, "utf8").trim()
        : "";

    //Split file into lines
    let lines = content ? content.split("\n") : [];
    
    //Check if duplicate exists
    //same driverID + same date
    for (let line of lines) {

        // skip empty lines
        if (!line.trim()) continue;

        let cols = line.split(",");

        if (
            cols[0] === shiftObj.driverID &&
            cols[2] === shiftObj.date
        ) {
            return {}; // duplicate found
        }
    }


    let shiftDuration = getShiftDuration(
        shiftObj.startTime,
        shiftObj.endTime
    );
    let idleTime = getIdleTime(
        shiftObj.startTime,
        shiftObj.endTime
    );
    let activeTime = getActiveTime(
        shiftDuration,idleTime
    );
    let metQ = metQuota(
        shiftObj.date,activeTime
    );
    let hasB = false; 

    let newLine =
        `${shiftObj.driverID},${shiftObj.driverName},${shiftObj.date},` +
        `${shiftObj.startTime},${shiftObj.endTime},` +
        `${shiftDuration},${idleTime},${activeTime},` +
        `${metQ},${hasB}`;
    
    // Find where to insert
    // after last record of this driver
    let insertIndex = lines.length;

    for (let i = lines.length - 1; i >= 0; i--) {

        if (!lines[i].trim()) continue;

        let cols = lines[i].split(",");

        if (cols[0] === shiftObj.driverID) {

            insertIndex = i + 1;
            break;
        }
    }

    // Insert new record
    lines.splice(insertIndex, 0, newLine);
    fs.writeFileSync(
        textFile,
        lines.join("\n") + "\n"
    );

    return {

        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQ,
        hasBonus: hasB
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.split("\n");
    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0] === driverID && cols[2] === date) {
            cols[9] = newValue.toString().toLowerCase();
            lines[i] = cols.join(",");
            break;
        }
    }
    fs.writeFileSync(textFile, lines.join("\n"));
}


// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content ? content.split("\n") : [];
    let count = 0;
    let exists = false;
    let monthStr = month.toString().padStart(2, "0");

    for (let line of lines) {
        let trimmed = line.trim();
        if (!trimmed) continue;
        let cols = trimmed.split(",");
        if (cols[0] === driverID) {
            exists = true;
            let dMonth = cols[2].split("-")[1];
            if (dMonth === monthStr && cols[9].toLowerCase() === "true") {
                count++;
            }
        }
    }
    return exists ? count : -1;
}


// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content ? content.split("\n") : [];
    let totalSec = 0;
    let monthStr = month.toString().padStart(2, "0");
    for (let line of lines) {
        let trimmed = line.trim();
        if (!trimmed) continue;
        let cols = trimmed.split(",");
        if (cols[0] === driverID) {
            let dMonth = cols[2].split("-")[1];
            if (dMonth === monthStr) {
                totalSec += timeToSeconds(cols[7]);
            }
        }
    }
    return secondsToHMS(totalSec);
}


// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
// ============================================================
// 9 getRequiredHoursPerMonth

function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
// TODO: Implement this function
    // read shift file
    let content = fs.readFileSync(textFile, "utf8").trim();
    let lines = content ? content.split("\n") : [];

    // read rate file
    let rateContent = fs.readFileSync(rateFile, "utf8").trim();
    let rateLines = rateContent ? rateContent.split("\n") : [];


    // get dayOff of driver
    let dayOff = "";

    for (let line of rateLines) {

        if (!line.trim()) continue;

        let cols = line.split(",");

        if (cols[0] === driverID) {
            dayOff = cols[1];
            break;
        }
    }
    
    // prepare month format
    let monthStr = month.toString().padStart(2, "0");
    let totalSec = 0;
    
    // loop shifts
    for (let line of lines) {
        if (!line.trim()) continue;
        let cols = line.split(",");
        if (cols[0] !== driverID) continue;
        let date = cols[2];
        let [y, m, d] = date.split("-").map(Number);
        let dMonth = m.toString().padStart(2, "0");
        if (dMonth !== monthStr) continue;

        // check dayOff
        let dayName =
            new Date(date).toLocaleDateString(
                "en-US",
                { weekday: "long" }
            );

        if (dayName === dayOff) continue;

        // check Eid period
        let isEid =
            (y === 2025 && m === 4 && d >= 10 && d <= 30);


        if (isEid) {
            totalSec += 6 * 3600;
        }
        else {
            totalSec += 8 * 3600 + 24 * 60;
        }
    }
    // reduce bonus hours
    // each bonus reduces 2 hours
    totalSec -= bonusCount * (2 * 3600);
    if (totalSec < 0) totalSec = 0;
    return secondsToHMS(totalSec);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
    let content = fs.readFileSync(rateFile, "utf8").trim();
    let lines = content ? content.split("\n") : [];
    let basePay = 0, tier = 0;
    for (let line of lines) {
        let cols = line.split(",");
        if (cols[0] === driverID) {
            basePay = parseInt(cols[2]);
            tier = parseInt(cols[3]);
            break;
        }
    }
    let actualSec = timeToSeconds(actualHours);
    let requiredSec = timeToSeconds(requiredHours);
    let missingSec = requiredSec - actualSec;
    if (missingSec <= 0) return basePay;
    let missingH = missingSec / 3600;
    let allowed = [0, 50, 20, 10, 3][tier];
    let effective = Math.max(0, Math.floor(missingH) - allowed);
    let deductionRate = Math.floor(basePay / 185);
    let deduction = effective * deductionRate;
    return basePay - deduction;
}


module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
