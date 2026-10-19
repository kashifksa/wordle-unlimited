<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>Wordle Unlimited — XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background-color: #f8fafc;
            margin: 0;
            padding: 30px 16px;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            padding: 32px;
            border: 1px solid #e2e8f0;
          }
          .header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 8px;
          }
          h1 {
            color: #0f172a;
            font-size: 22px;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .badge {
            background-color: #6aaa64;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
          }
          p.desc {
            color: #64748b;
            font-size: 14px;
            margin-top: 6px;
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .table-wrapper {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: 600;
            padding: 12px 16px;
            border-bottom: 2px solid #e2e8f0;
            white-space: nowrap;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:hover td {
            background-color: #f8fafc;
          }
          a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
            word-break: break-all;
          }
          a:hover {
            text-decoration: underline;
          }
          .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #94a3b8;
            text-align: center;
          }
          .footer a {
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-row">
            <h1>Wordle Unlimited XML Sitemap</h1>
            <span class="badge"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs</span>
          </div>
          <p class="desc">
            This XML Sitemap is formatted for search engines (Google, Bing, etc.) and contains multilingual game URLs with full hreflang targeting.
          </p>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: 55%;">URL</th>
                  <th style="width: 15%;">Last Modified</th>
                  <th style="width: 15%;">Change Frequency</th>
                  <th style="width: 15%;">Priority</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                    </td>
                    <td><xsl:value-of select="sitemap:lastmod"/></td>
                    <td><xsl:value-of select="sitemap:changefreq"/></td>
                    <td><xsl:value-of select="sitemap:priority"/></td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
          <div class="footer">
            Wordle Unlimited &bull; <a href="https://todaywordlehint.com/">todaywordlehint.com</a>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
