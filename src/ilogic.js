/* ================= KH Fab — Autodesk Inventor iLogic rule generator =================
   VB_GEOM / VB_INV are injected by build.py from src/ilogic/*.vb */
const VB_TPL = {
  pegboard: { fn: 'Pegboard', ul: ['n'] },
  bench: { fn: 'Bench', ul: [] },
  chair: { fn: 'Chair', ul: ['n'], deg: ['a'] },
  rack: { fn: 'Rack', ul: ['k'] },
  lbracket: { fn: 'LBracket', ul: ['nh', 'n'] },
  baseplate: { fn: 'BasePlate', ul: ['nx', 'ny', 'n'] },
  bucket: { fn: 'Bucket', ul: ['earQty', 'wearN', 'cutter'], deg: ['alpha'] }
};
function bucketVbParams(B) {
  const o = {}; ['W', 'D', 'H', 'R', 'alpha', 'lipL', 'topD', 'pin', 'pitch', 'hc', 'boss', 'earQty', 'wearN', 'wearW', 'cutterW'].forEach(k => o[k] = +B[k] || 0);
  o.cutter = B.cutter ? 1 : 0; ['side', 'wrap', 'lip', 'top', 'ear', 'wear'].forEach(k => o[k + '_t'] = +B[k].thk);
  return o;
}
function ilogicRule(id, params, title) {
  const T = VB_TPL[id], fmt = v => { const s = String(Number((+v).toFixed(6))); return /[.eE]/.test(s) ? s : s + '.0'; };
  const lines = Object.entries(params).map(([k, v]) => {
    const u = (T.ul || []).includes(k) ? 'ul' : (T.deg || []).includes(k) ? 'deg' : 'mm';
    return `    p("${k}") = KI.Par(prm, "KH_${k}", ${fmt(v)}, "${u}")`;
  }).join('\n');
  return `' ============================================================================
' Kh International · KH Fab — iLogic параметрт загвар: ${title}
' Үүсгэсэн: ${today()}
'
' ХЭРЭГЛЭХ:
'  1. Inventor-т шинэ Assembly (.iam) нээгээд ХАДГАЛНА (эд ангиуд энэ хавтсанд үүснэ),
'     эсвэл ганц эд анги хэрэгтэй бол шинэ Part (.ipt) нээнэ.
'  2. Manage → iLogic → Add Rule → нэр өгөөд энэ текстийг бүтнээр нь буулгаад Save & Run.
'  3. Parameters (fx) цонхонд KH_ гэсэн параметрүүд үүснэ. Утгыг өөрчлөөд дүрмийг дахин
'     ажиллуулна. Автоматаар ажиллуулах бол: Manage → Event Triggers → Any User Parameter Change.
'  4. Part дээр KH_Part параметрээр аль эд ангийг зурахыг сонгоно.
'  Эд анги бүр 3D бие хэлбэрээр зурагдана (нугалсан хэсгийг тэгш өнцөгт хана болгож).
'  Лазерын дэлгэмэл, нугалах шугамыг KH Fab-ын DXF-ээс авна.
' ============================================================================
Imports System.Collections.Generic

Sub Main()
    Dim doc As Document = ThisDoc.Document
    Dim isAsm As Boolean = (doc.DocumentType = DocumentTypeEnum.kAssemblyDocumentObject)
    Dim prm As Parameters
    If isAsm Then
        prm = CType(doc, AssemblyDocument).ComponentDefinition.Parameters
    Else
        prm = CType(doc, PartDocument).ComponentDefinition.Parameters
    End If
    Dim p As New Dictionary(Of String, Double)
${lines}
    Dim m As KModel = KG.${T.fn}(p)
    If isAsm Then
        KI.BuildAssembly(ThisApplication, CType(doc, AssemblyDocument), m, "${id}")
    Else
        Dim keys As New List(Of String)
        For Each q As KPart In m.Parts
            keys.Add(q.Key)
        Next
        Dim sel As String = KI.TextPar(prm, "KH_Part", keys(0))
        MultiValue.SetList("KH_Part", keys.ToArray())
        Dim part As KPart = m.Part(sel)
        If part Is Nothing Then part = m.Parts(0)
        KI.BuildPart(ThisApplication, CType(doc, PartDocument), part)
    End If
End Sub

${VB_GEOM}
${VB_INV}`;
}
