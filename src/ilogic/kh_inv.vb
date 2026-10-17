'================ KH_INV — Inventor-д зурах, угсрах ================
Public Class KI
    ' user parameter: create with the default if missing, return the value in mm / deg / unitless
    Public Shared Function Par(prm As Parameters, name As String, def As Double, units As String) As Double
        Dim q As Parameter = Nothing
        Try
            q = prm.Item(name)
        Catch
            q = Nothing
        End Try
        If q Is Nothing Then
            If units = "mm" Then
                q = prm.UserParameters.AddByValue(name, def / 10.0, "mm")
            ElseIf units = "deg" Then
                q = prm.UserParameters.AddByValue(name, def * Math.PI / 180.0, "deg")
            Else
                q = prm.UserParameters.AddByValue(name, def, UnitsTypeEnum.kUnitlessUnits)
            End If
        End If
        Dim r As Double = CDbl(q.Value)
        If units = "mm" Then Return r * 10.0
        If units = "deg" Then Return r * 180.0 / Math.PI
        Return r
    End Function
    Public Shared Function TextPar(prm As Parameters, name As String, def As String) As String
        Dim q As Parameter = Nothing
        Try
            q = prm.Item(name)
        Catch
            q = Nothing
        End Try
        If q Is Nothing Then q = prm.UserParameters.AddByValue(name, def, UnitsTypeEnum.kTextUnits)
        Return CStr(q.Value)
    End Function

    Public Shared Sub ClearKH(def As PartComponentDefinition)
        For i As Integer = def.Features.ExtrudeFeatures.Count To 1 Step -1
            Dim f As ExtrudeFeature = def.Features.ExtrudeFeatures.Item(i)
            If f.Name.StartsWith("KH_") Then f.Delete()
        Next
        For i As Integer = def.Sketches.Count To 1 Step -1
            Dim s As PlanarSketch = def.Sketches.Item(i)
            If s.Name.StartsWith("KH_") Then s.Delete()
        Next
        For i As Integer = def.WorkPlanes.Count To 1 Step -1
            Dim w As WorkPlane = def.WorkPlanes.Item(i)
            If w.Name.StartsWith("KH_") Then w.Delete()
        Next
    End Sub

    Private Shared Function SP(tg As TransientGeometry, sk As PlanarSketch, f As KFrame, x As Double, y As Double) As Point2d
        Return sk.ModelToSketchSpace(tg.CreatePoint((f.O(0) + x * f.U(0) + y * f.V(0)) / 10.0, (f.O(1) + x * f.U(1) + y * f.V(1)) / 10.0, (f.O(2) + x * f.U(2) + y * f.V(2)) / 10.0))
    End Function

    Public Shared Sub DrawLoop(tg As TransientGeometry, sk As PlanarSketch, f As KFrame, lp As List(Of KV), flip As Boolean)
        Dim n As Integer = lp.Count
        If n = 2 AndAlso Math.Abs(Math.Abs(lp(0).B) - 1) < 0.000000001 AndAlso Math.Abs(lp(0).B - lp(1).B) < 0.000000001 Then
            Dim r As Double = Math.Sqrt((lp(0).X - lp(1).X) ^ 2 + (lp(0).Y - lp(1).Y) ^ 2) / 2
            sk.SketchCircles.AddByCenterRadius(SP(tg, sk, f, (lp(0).X + lp(1).X) / 2, (lp(0).Y + lp(1).Y) / 2), r / 10.0)
            Return
        End If
        Dim pts(n - 1) As SketchPoint
        For i As Integer = 0 To n - 1
            pts(i) = sk.SketchPoints.Add(SP(tg, sk, f, lp(i).X, lp(i).Y), False)
        Next
        For i As Integer = 0 To n - 1
            Dim a As KV = lp(i), b As KV = lp((i + 1) Mod n), j As Integer = (i + 1) Mod n
            If Math.Abs(a.B) < 0.000000001 Then
                sk.SketchLines.AddByTwoPoints(pts(i), pts(j))
            Else
                Dim dx As Double = b.X - a.X, dy As Double = b.Y - a.Y, k As Double = (1 - a.B * a.B) / (4 * a.B)
                Dim cx As Double = (a.X + b.X) / 2 - k * dy, cy As Double = (a.Y + b.Y) / 2 + k * dx
                sk.SketchArcs.AddByCenterStartEndPoint(SP(tg, sk, f, cx, cy), pts(i), pts(j), (a.B > 0) Xor flip)
            End If
        Next
    End Sub

    Public Shared Sub DrawSolid(app As Inventor.Application, def As PartComponentDefinition, s As KSolid, k As Integer)
        Dim tg As TransientGeometry = app.TransientGeometry
        Dim f As KFrame = s.Fr
        Dim wp As WorkPlane = def.WorkPlanes.AddFixed(tg.CreatePoint(f.O(0) / 10.0, f.O(1) / 10.0, f.O(2) / 10.0), tg.CreateUnitVector(f.U(0), f.U(1), f.U(2)), tg.CreateUnitVector(f.V(0), f.V(1), f.V(2)))
        wp.Name = "KH_WP" & k
        wp.Visible = False
        Dim sk As PlanarSketch = def.Sketches.Add(wp)
        sk.Name = "KH_SK" & k
        Dim pl As Plane = CType(sk.PlanarEntityGeometry, Plane)
        Dim flip As Boolean = (pl.Normal.X * f.N(0) + pl.Normal.Y * f.N(1) + pl.Normal.Z * f.N(2)) < 0
        For Each lp As List(Of KV) In s.Loops
            DrawLoop(tg, sk, f, lp, flip)
        Next
        Dim prof As Profile = sk.Profiles.AddForSolid()
        Dim ed As ExtrudeDefinition = def.Features.ExtrudeFeatures.CreateExtrudeDefinition(prof, PartFeatureOperationEnum.kNewBodyOperation)
        If flip Then
            ed.SetDistanceExtent(s.T / 10.0, PartFeatureExtentDirectionEnum.kNegativeExtentDirection)
        Else
            ed.SetDistanceExtent(s.T / 10.0, PartFeatureExtentDirectionEnum.kPositiveExtentDirection)
        End If
        Dim ef As ExtrudeFeature = def.Features.ExtrudeFeatures.Add(ed)
        ef.Name = "KH_EX" & k
    End Sub

    Public Shared Sub BuildPart(app As Inventor.Application, doc As PartDocument, part As KPart)
        Dim def As PartComponentDefinition = doc.ComponentDefinition
        ClearKH(def)
        Dim k As Integer = 0
        For Each s As KSolid In part.Solids
            k += 1
            DrawSolid(app, def, s, k)
        Next
        Try
            doc.PropertySets.Item("Design Tracking Properties").Item("Description").Value = part.Name & " (" & part.Thk & " mm)"
        Catch
        End Try
        doc.Update()
    End Sub

    Public Shared Sub BuildAssembly(app As Inventor.Application, asm As AssemblyDocument, m As KModel, tpl As String)
        If asm.FullFileName = "" Then
            MessageBox.Show("Эхлээд угсралтын файлаа хадгална уу (Save), дараа нь дүрмийг дахин ажиллуулна.", "KH Fab")
            Return
        End If
        Dim folder As String = System.IO.Path.GetDirectoryName(asm.FullFileName)
        Dim acd As AssemblyComponentDefinition = asm.ComponentDefinition
        For i As Integer = acd.Occurrences.Count To 1 Step -1
            Dim oc As ComponentOccurrence = acd.Occurrences.Item(i)
            If oc.Name.StartsWith("KH_") Then oc.Delete()
        Next
        app.Documents.CloseAll(True)
        Dim tg As TransientGeometry = app.TransientGeometry
        Dim tmpl As String = app.FileManager.GetTemplateFile(DocumentTypeEnum.kPartDocumentObject)
        Dim paths As New Dictionary(Of String, String)
        For Each pt As KPart In m.Parts
            Dim path As String = System.IO.Path.Combine(folder, "KH_" & tpl & "_" & pt.Key & ".ipt")
            Dim pd As PartDocument = CType(app.Documents.Add(DocumentTypeEnum.kPartDocumentObject, tmpl, False), PartDocument)
            BuildPart(app, pd, pt)
            pd.SaveAs(path, False)
            pd.Close(True)
            paths(pt.Key) = path
        Next
        Dim cnt As New Dictionary(Of String, Integer)
        For Each pl As KPlace In m.Places
            Dim f As KFrame = pl.Fr
            Dim mx As Matrix = tg.CreateMatrix()
            mx.SetCoordinateSystem(tg.CreatePoint(f.O(0) / 10.0, f.O(1) / 10.0, f.O(2) / 10.0), tg.CreateVector(f.U(0), f.U(1), f.U(2)), tg.CreateVector(f.V(0), f.V(1), f.V(2)), tg.CreateVector(f.N(0), f.N(1), f.N(2)))
            Dim oc As ComponentOccurrence = acd.Occurrences.Add(paths(pl.Key), mx)
            If Not cnt.ContainsKey(pl.Key) Then cnt(pl.Key) = 0
            cnt(pl.Key) += 1
            Try
                oc.Name = "KH_" & pl.Key & "_" & cnt(pl.Key)
            Catch
            End Try
            oc.Grounded = True
        Next
        asm.Update()
    End Sub
End Class
